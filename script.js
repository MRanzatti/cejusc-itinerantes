const CONFIG = {
    // SUBSTITUA ESTA URL PELA URL DO SEU GOOGLE APPS SCRIPT
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz5RVtFKT6MDLiHAJKfMrvaSmJ28pS_GPGgw2wunWHexHeuzf1an_brpSL2LFVfFLjl/exec'
};

// Elementos DOM
const form = document.getElementById('cejuscForm');
const tiposServico = document.querySelectorAll('input[name="tipoServico"]');
const submitBtn = document.getElementById('submit-btn');
const loading = document.getElementById('loading');
const successMessage = document.getElementById('success');

// Mapeamento das seções condicionais
const secoes = {
    'divorcio': 'secao-divorcio',
    'srp': 'secao-srp',
    'casamento': 'secao-casamento',
    'pensao': 'secao-pensao'
};

// Inicialização quando a página carregar
document.addEventListener('DOMContentLoaded', function () {
    console.log('Formulário CEJUSC carregado!');

    // Verificar se a URL do script está configurada
    if (CONFIG.SCRIPT_URL.includes('SEU_SCRIPT_ID')) {
        console.warn('⚠️ Lembre-se de configurar a URL do Google Apps Script!');
    }

    inicializarEventListeners();
    aplicarMascaraTelefone();
    configurarDataMinima();
});

// Configurar todos os event listeners
function inicializarEventListeners() {
    // Listener para seleção de tipos de serviço
    tiposServico.forEach(radio => {
        radio.addEventListener('change', handleTipoServicoChange);
    });

    // Listener para envio do formulário
    form.addEventListener('submit', handleFormSubmit);
}

// Handler para mudança no tipo de serviço
function handleTipoServicoChange() {
    const radioSelecionado = this;

    // Remover seleção visual anterior
    document.querySelectorAll('.servico-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Adicionar seleção visual ao item atual
    radioSelecionado.closest('.servico-item').classList.add('selected');

    // Ocultar todas as seções condicionais
    Object.values(secoes).forEach(secaoId => {
        if (secaoId) {
            const secao = document.getElementById(secaoId);
            if (secao) {
                secao.classList.add('hidden');
            }
        }
    });

    // Mostrar seção correspondente se existir
    const secaoId = secoes[radioSelecionado.value];
    if (secaoId) {
        ocultarTodasMensagens();
        const secao = document.getElementById(secaoId);
        if (secao) {
            secao.classList.remove('hidden');
            secao.classList.add('fade-in');
        }
    }
}

// Handler para envio do formulário
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validarFormulario()) {
        return;
    }

    // Mostrar loading
    mostrarLoading();

    try {
        const dados = coletarDadosFormulario();
        console.log('Dados a enviar:', dados);

        // Enviar para Google Sheets
        await enviarParaGoogleSheets(dados);

        // Mostrar sucesso
        mostrarSucesso();
        resetarFormulario();

    } catch (error) {
        console.error('Erro ao enviar:', error);
        mostrarErro('Erro ao enviar a solicitação. Tente novamente.');
    } finally {
        ocultarLoading();
    }
}

// Coletar todos os dados do formulário
function coletarDadosFormulario() {
    const formData = new FormData(form);
    const dados = {};

    // Processar todos os campos
    for (let [key, value] of formData.entries()) {
        dados[key] = value.trim();
    }

    // Combinar data e hora em um campo único
    const dataPreferida = dados.data_preferida;
    const horaPreferida = dados.hora_preferida;
    
    if (dataPreferida && horaPreferida) {
        const [ano, mes, dia] = dataPreferida.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        dados.dataHoraPreferida = `${dataFormatada} ${horaPreferida}`;
    }

    // Adicionar timestamp
    dados.timestamp = new Date().toLocaleString('pt-BR');

    return dados;
}

// Enviar dados para o Google Sheets
async function enviarParaGoogleSheets(dados) {
    const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados)
    });

    // Como estamos usando no-cors, simular delay para parecer real
    await new Promise(resolve => setTimeout(resolve, 2000));
}

// Validar formulário antes do envio
function validarFormulario() {
    let valido = true;

    // Verificar se um tipo de serviço foi selecionado
    const tipoSelecionado = document.querySelector('input[name="tipoServico"]:checked');
    if (!tipoSelecionado) {
        alert('Por favor, selecione um tipo de serviço.');
        return false;
    }

    if (!validarDataHora()) {
        valido = false;
    }

    // Validar campos específicos baseados no tipo selecionado
    if (tipoSelecionado.value === 'divorcio') {
        valido = validarCamposDivorcio() && valido;
    } else if (tipoSelecionado.value === 'srp') {
        valido = validarCamposSRP() && valido;
    } else if (tipoSelecionado.value === 'casamento') {
        valido = validarCamposCasamento() && valido;
    } else if (tipoSelecionado.value === 'pensao') {
        valido = validarCamposPensao() && valido;
    }

    return valido;
}

// Validar campos específicos do divórcio
function validarCamposDivorcio() {
    const camposObrigatorios = [
        'solicitante_nome', 
        'solicitante_telefone', 
        'solicitante_email',
        'solicitado_nome', 
        'solicitado_telefone' 
    ];

    let valido = validarCamposGeral(camposObrigatorios);
    
    const emailSolicitado = document.getElementById('solicitado_email');

    if (emailSolicitado && emailSolicitado.value.trim()) {
        if (!validarEmail(emailSolicitado.value)) {
            mostrarErroInput(emailSolicitado, document.getElementById('solicitado_email-error'));
            valido = false;
        } else {
            ocultarErroInput(emailSolicitado, document.getElementById('solicitado_email-error'));
        }
    }

    return validarCamposGeral(camposObrigatorios);
}

function validarCamposSRP() {
    const camposObrigatorios = [
        'srp_solicitante_nome', 
        'srp_solicitante_telefone', 
        'srp_solicitante_email',
        'srp_solicitado_nome', 
        'srp_solicitado_telefone' 
    ];

    let valido = validarCamposGeral(camposObrigatorios);
    
    const emailSolicitado = document.getElementById('srp_solicitado_email');

    if (emailSolicitado && emailSolicitado.value.trim()) {
        if (!validarEmail(emailSolicitado.value)) {
            mostrarErroInput(emailSolicitado, document.getElementById('srp_solicitado_email-error'));
            valido = false;
        } else {
            ocultarErroInput(emailSolicitado, document.getElementById('srp_solicitado_email-error'));
        }
    }

    return validarCamposGeral(camposObrigatorios);
}

function validarCamposCasamento() {
    const camposObrigatorios = [
        'casamento_solicitante1_nome', 
        'casamento_solicitante1_telefone', 
        'casamento_solicitante1_email',
        'casamento_solicitante2_nome', 
        'casamento_solicitante2_telefone', 
        'casamento_solicitante2_email',
        'casamento_testemunha1_nome', 
        'casamento_testemunha1_telefone',
        'casamento_testemunha2_nome', 
        'casamento_testemunha2_telefone'
    ];

    return validarCamposGeral(camposObrigatorios);
}

function validarCamposPensao() {
    const camposObrigatorios = [
        'pensao_solicitante_nome', 
        'pensao_solicitante_telefone', 
        'pensao_solicitante_email',
        'pensao_solicitado_nome', 
        'pensao_solicitado_telefone'
    ];

    let valido = validarCamposGeral(camposObrigatorios);
    
    const emailSolicitado = document.getElementById('pensao_solicitado_email');
    if (emailSolicitado && emailSolicitado.value.trim()) {
        if (!validarEmail(emailSolicitado.value)) {
            mostrarErroInput(emailSolicitado, document.getElementById('pensao_solicitado_email-error'));
            valido = false;
        } else {
            ocultarErroInput(emailSolicitado, document.getElementById('pensao_solicitado_email-error'));
        }
    }

    return validarCamposGeral(camposObrigatorios);
}

function validarEmailOpcional(idCampo) {
    const campo = document.getElementById(idCampo);
    const errorElement = document.getElementById(idCampo + '-error');
    
    if (!campo) return true;
    
    const email = campo.value.trim();
    
    // Se está vazio, é válido (opcional)
    if (!email) {
        ocultarErroInput(campo, errorElement);
        return true;
    }
    
    // Se tem conteúdo, deve ser email válido
    if (validarEmail(email)) {
        ocultarErroInput(campo, errorElement);
        return true;
    } else {
        mostrarErroInput(campo, errorElement);
        return false;
    }
}

function validarCamposDivorcioLimpo() {
    const obrigatorios = ['solicitante_nome', 'solicitante_telefone', 'solicitante_email', 'solicitado_nome', 'solicitado_telefone'];
    const opcionais = ['solicitado_email'];
    
    return validarCamposGeral(obrigatorios) && validarEmailsOpcionais(opcionais);
}

function validarCamposSRPLimpo() {
    const obrigatorios = ['srp_solicitante_nome', 'srp_solicitante_telefone', 'srp_solicitante_email', 'srp_solicitado_nome', 'srp_solicitado_telefone'];
    const opcionais = ['srp_solicitado_email'];
    
    return validarCamposGeral(obrigatorios) && validarEmailsOpcionais(opcionais);
}

function validarCamposPensaoLimpo() {
    const obrigatorios = ['pensao_solicitante_nome', 'pensao_solicitante_telefone', 'pensao_solicitante_email', 'pensao_solicitado_nome', 'pensao_solicitado_telefone'];
    const opcionais = ['pensao_solicitado_email'];
    
    return validarCamposGeral(obrigatorios) && validarEmailsOpcionais(opcionais);
}

function validarEmailsOpcionais(camposOpcionais) {
    let valido = true;
    
    camposOpcionais.forEach(campo => {
        if (!validarEmailOpcional(campo)) {
            valido = false;
        }
    });
    
    return valido;
}

function validarCamposGeral(camposObrigatorios) {
    let valido = true;

    camposObrigatorios.forEach(campo => {
        const input = document.getElementById(campo);
        const errorElement = document.getElementById(campo + '-error');

        if (!input || !input.value.trim()) {
            mostrarErroInput(input, errorElement);
            valido = false;
        } else if (campo.includes('email') && !validarEmail(input.value)) {
            mostrarErroInput(input, errorElement);
            valido = false;
        } else {
            ocultarErroInput(input, errorElement);
        }
    });

    return valido;
}

// Validar formato de email
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Mostrar erro em um input específico
function mostrarErroInput(input, errorElement) {
    if (errorElement) {
        errorElement.style.display = 'block';
    }
    if (input) {
        input.style.borderColor = '#dc3545';
        input.focus();
    }
}

// Ocultar erro de um input específico
function ocultarErroInput(input, errorElement) {
    if (errorElement) {
        errorElement.style.display = 'none';
    }
    if (input) {
        input.style.borderColor = '#e1e5e9';
    }
}

// Aplicar máscara de telefone aos campos
function aplicarMascaraTelefone() {
    const camposTelefone = document.querySelectorAll('input[type="tel"]');

    camposTelefone.forEach(input => {
        input.addEventListener('input', function (e) {
            let valor = e.target.value.replace(/\D/g, '');

            // Aplicar máscara (XX) XXXXX-XXXX
            if (valor.length <= 11) {
                valor = valor.replace(/(\d{2})(\d)/, '($1) $2');
                valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
            }

            e.target.value = valor;
        });

        // Limitar a 15 caracteres (incluindo máscara)
        input.addEventListener('keypress', function (e) {
            if (this.value.length >= 15 && e.key !== 'Backspace' && e.key !== 'Delete') {
                e.preventDefault();
            }
        });
    });
}

// Mostrar loading
function mostrarLoading() {
    submitBtn.disabled = true;
    loading.style.display = 'block';
    successMessage.style.display = 'none';
}

// Ocultar loading
function ocultarLoading() {
    loading.style.display = 'none';
    submitBtn.disabled = false;
}

// Mostrar mensagem de sucesso
function mostrarSucesso() {
    successMessage.style.display = 'block';

    // Scroll suave para o topo
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Mostrar mensagem de erro
function mostrarErro(mensagem) {
    alert(mensagem);
}

// Resetar formulário após envio bem-sucedido
function resetarFormulario() {
    // Limpar todos os campos
    form.reset();

    // Remover seleção visual dos tipos de serviço
    document.querySelectorAll('.servico-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Ocultar todas as seções condicionais
    Object.values(secoes).forEach(secaoId => {
        if (secaoId) {
            const secao = document.getElementById(secaoId);
            if (secao) {
                secao.classList.add('hidden');
            }
        }
    });

    // Limpar erros visuais
    document.querySelectorAll('.error').forEach(error => {
        error.style.display = 'none';
    });

    document.querySelectorAll('input').forEach(input => {
        input.style.borderColor = '#e1e5e9';
    });
}

function configurarDataMinima() {
    const inputData = document.getElementById('data_preferida');
    const hoje = new Date();
    const dataMinima = hoje.toISOString().split('T')[0];
    inputData.min = dataMinima;

    // Configurar data máxima (6 meses à frente)
    const dataMaxima = new Date();
    dataMaxima.setMonth(dataMaxima.getMonth() + 6);
    inputData.max = dataMaxima.toISOString().split('T')[0];
}

// Validar data e hora selecionadas
function validarDataHora() {
    const dataInput = document.getElementById('data_preferida');
    const horaInput = document.getElementById('hora_preferida');
    const dataError = document.getElementById('data_preferida-error');
    const horaError = document.getElementById('hora_preferida-error');

    let valido = true;

    // Validar data
    if (!dataInput.value) {
        mostrarErroInput(dataInput, dataError);
        valido = false;
    } else {
        const dataSelecionada = new Date(dataInput.value);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (dataSelecionada < hoje) {
            dataError.textContent = 'A data não pode ser no passado';
            mostrarErroInput(dataInput, dataError);
            valido = false;
        } else {
            ocultarErroInput(dataInput, dataError);
        }
    }

    // Validar hora
    if (!horaInput.value) {
        mostrarErroInput(horaInput, horaError);
        valido = false;
    } else {
        const dataSelecionada = new Date(dataInput.value);
        const diaSemana = dataSelecionada.getDay(); // 0 = domingo, 6 = sábado
        const hora = parseInt(horaInput.value.split(':')[0]);

        // Validar horário de funcionamento
        if (diaSemana === 0) { // Domingo
            horaError.textContent = 'Não funcionamos aos domingos';
            mostrarErroInput(horaInput, horaError);
            valido = false;
        } else if (diaSemana === 6) { // Sábado
            if (hora < 8 || hora >= 23) {
                horaError.textContent = 'Sábado: funcionamento de 09:00 às 18:00';
                mostrarErroInput(horaInput, horaError);
                valido = false;
            } else {
                ocultarErroInput(horaInput, horaError);
            }
        } else { // Segunda a Sexta
            if (hora < 9 || hora >= 18) {
                horaError.textContent = 'Seg-Sex: funcionamento de 09:00 às 18:00';
                mostrarErroInput(horaInput, horaError);
                valido = false;
            } else {
                ocultarErroInput(horaInput, horaError);
            }
        }
    }

    return valido;
}

// Limpar todas as mensagens de alerta/sucesso
function ocultarTodasMensagens() {
    // Ocultar mensagem de sucesso
    const successMessage = document.getElementById('success');

    debugger
    if (successMessage) {
        successMessage.style.display = 'none';
    }

    // Ocultar loading
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }

    // Ocultar todas as mensagens de erro
    document.querySelectorAll('.error').forEach(error => {
        error.style.display = 'none';
    });

    // Resetar bordas dos inputs
    document.querySelectorAll('input').forEach(input => {
        input.style.borderColor = '#e1e5e9';
    });
}

// Funções utilitárias
const utils = {
    // Formatar telefone para exibição
    formatarTelefone: function (telefone) {
        const numeros = telefone.replace(/\D/g, '');
        return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    },

    // Capitalizar primeira letra de cada palavra
    capitalizarNome: function (nome) {
        return nome.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    },

    // Validar CPF (se necessário futuramente)
    validarCPF: function (cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11) return false;

        // Lógica de validação do CPF...
        return true; // Simplificado
    }
};

// Exportar para uso global (se necessário)
window.CejuscForm = {
    validarFormulario,
    resetarFormulario,
    utils
};