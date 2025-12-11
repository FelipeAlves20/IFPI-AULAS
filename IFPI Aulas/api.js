// api.js - Cliente da API para conectar Frontend com Backend
const API_URL = 'http://localhost:5000/api';

// Função para pegar o token salvo
function getToken() {
    // Tenta pegar do sessionStorage primeiro, depois do localStorage
    return sessionStorage.getItem('token') || localStorage.getItem('token');
}

// Função para salvar o token
function saveToken(token) {
  localStorage.setItem('token', token);
}

// Função para remover o token (logout)
function removeToken() {
  localStorage.removeItem('token');
}

// ==================== AUTENTICAÇÃO ====================

// Login
async function login(matricula, senha, tipo, curso, serie) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                matricula,
                senha,
                tipo,
                curso,
                serie
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
        }

        // 🔥 SALVA O TOKEN E A MATRÍCULA CORRETAMENTE
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('teacherUsername', data.usuario.matricula);  // 👈 IMPORTANTE!
        sessionStorage.setItem('userName', data.usuario.nome);
        sessionStorage.setItem('userType', data.usuario.tipo);

        return data;

    } catch (error) {
        throw error;
    }
}

// Registro (criar novo usuário)
async function registro(dadosUsuario) {
  try {
    const response = await fetch(`${API_URL}/auth/registro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosUsuario)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao criar usuário');
    }

    return data;
  } catch (error) {
    console.error('Erro no registro:', error);
    throw error;
  }
}

// ==================== MATÉRIAS ====================

// Buscar todas as matérias do professor
async function getMaterias() {
  try {
    const response = await fetch(`${API_URL}/materias`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar matérias:', error);
    throw error;
  }
}

// Buscar matéria específica
async function getMateria(codigo) {
  try {
    const response = await fetch(`${API_URL}/materias/${codigo}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar matéria:', error);
    throw error;
  }
}

// Adicionar conteúdo em uma matéria
async function addConteudoMateria(codigo, tipo, conteudo) {
  try {
    const response = await fetch(`${API_URL}/materias/${codigo}/${tipo}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(conteudo)
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao adicionar conteúdo:', error);
    throw error;
  }
}

// Deletar conteúdo de uma matéria
async function deleteConteudoMateria(codigo, tipo, id) {
  try {
    const response = await fetch(`${API_URL}/materias/${codigo}/${tipo}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao deletar conteúdo:', error);
    throw error;
  }
}

// ==================== CALENDÁRIO ====================

// Buscar calendário completo
async function getCalendario() {
  try {
    const response = await fetch(`${API_URL}/calendario`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar calendário:', error);
    throw error;
  }
}

// Marcar falta
async function marcarFalta(dia, horario) {
  try {
    const response = await fetch(`${API_URL}/calendario/marcar-falta`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ dia, horario })
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao marcar falta:', error);
    throw error;
  }
}

async function ocuparHorario(dia, horario, materia) {
    const token = sessionStorage.getItem('token');
    const teacherUsername = sessionStorage.getItem('teacherUsername');
    
    // 🔥 Busca os dados corretos do professor atual
    const teachersDatabase = {
        '202412345': { name: 'Prof. Gilson', subjects: ['matematica'] },
        '202412346': { name: 'Profa. Lily', subjects: ['portugues'] },
        '202412347': { name: 'Prof. William', subjects: ['fisica'] },
        '202412348': { name: 'Prof. Renato', subjects: ['quimica'] },
        '202412349': { name: 'Prof. Rafael', subjects: ['biologia'] },
        '202412350': { name: 'Profa. Patrícia', subjects: ['historia'] },
        '202412351': { name: 'Prof. Neto', subjects: ['geografia'] },
        '202412352': { name: 'Profa. Lucy', subjects: ['ingles'] },
        '202412353': { name: 'Prof. Cleomir', subjects: ['espanhol'] },
        '202412354': { name: 'Profa. Jotinha', subjects: ['filosofia'] },
        '202412355': { name: 'Profa. Millene', subjects: ['sociologia'] },
        '202412356': { name: 'Prof. Cibely', subjects: ['educacao-fisica'] }
    };
    
    const currentTeacher = teachersDatabase[teacherUsername];
    
    const response = await fetch(`${API_URL}/calendario/ocupar-horario`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            dia,
            horario,
            materia
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Erro ao ocupar horário');
    }
    
    return data;
}

async function marcarFalta(dia, horario) {
    const token = sessionStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/calendario/marcar-falta`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            dia,
            horario
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Erro ao marcar falta');
    }
    
    return data;
}

// ==================== PORTAL EDUCACIONAL ====================

// Buscar notícias
async function getNoticias(categoria = 'todos') {
  try {
    const url = categoria === 'todos' 
      ? `${API_URL}/noticias` 
      : `${API_URL}/noticias?categoria=${categoria}`;
    
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    throw error;
  }
}

// Criar notícia
async function criarNoticia(noticia) {
  try {
    const response = await fetch(`${API_URL}/noticias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(noticia)
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar notícia:', error);
    throw error;
  }
}

// Deletar notícia
async function deletarNoticia(id) {
  try {
    const response = await fetch(`${API_URL}/noticias/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao deletar notícia:', error);
    throw error;
  }
}

// ==================== ÁREA ENEM ====================

// Buscar conteúdo ENEM
async function getConteudoEnem(tipo) {
  try {
    const response = await fetch(`${API_URL}/enem/${tipo}`);
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar conteúdo ENEM:', error);
    throw error;
  }
}

// Criar conteúdo ENEM
async function criarConteudoEnem(conteudo) {
  try {
    const response = await fetch(`${API_URL}/enem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(conteudo)
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar conteúdo ENEM:', error);
    throw error;
  }
}

// Deletar conteúdo ENEM
async function deletarConteudoEnem(id) {
  try {
    const response = await fetch(`${API_URL}/enem/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao deletar conteúdo ENEM:', error);
    throw error;
  }
}

// ==================== GRUPOS DE ESTUDO ====================

// Buscar grupos
async function getGrupos() {
  try {
    const response = await fetch(`${API_URL}/grupos`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar grupos:', error);
    throw error;
  }
}

// Criar grupo
async function criarGrupo(grupo) {
  try {
    const response = await fetch(`${API_URL}/grupos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(grupo)
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    throw error;
  }
}

// Entrar/Sair do grupo
async function toggleMembro(grupoId) {
  try {
    const response = await fetch(`${API_URL}/grupos/${grupoId}/toggle-membro`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao entrar/sair do grupo:', error);
    throw error;
  }
}

// Enviar mensagem no grupo
async function enviarMensagemGrupo(grupoId, mensagem) {
  try {
    const response = await fetch(`${API_URL}/grupos/${grupoId}/mensagens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(mensagem)
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
}

// ==================== SUPORTE ====================

// Buscar tickets
async function getTickets() {
  try {
    const response = await fetch(`${API_URL}/suporte`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar tickets:', error);
    throw error;
  }
}

// Criar ticket
async function criarTicket(ticket) {
  try {
    const token = getToken();
    console.log('🔍 Token encontrado:', token ? 'SIM' : 'NÃO');
    console.log('📝 Dados do ticket:', ticket);
    
    const response = await fetch(`${API_URL}/suporte`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(ticket)
    });

    const data = await response.json();
    console.log('✅ Resposta do servidor:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao criar ticket');
    }

    return data;
  } catch (error) {
    console.error('❌ Erro ao criar ticket:', error);
    throw error;
  }
}

// Deletar ticket
async function deletarTicket(id) {
  try {
    const response = await fetch(`${API_URL}/suporte/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    return await response.json();
  } catch (error) {
    console.error('Erro ao deletar ticket:', error);
    throw error;
  }
}

// ==================== HORÁRIOS DE ESTUDO ====================

// Buscar horários do aluno
async function getHorariosEstudo() {
  try {
    const response = await fetch(`${API_URL}/horarios`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar horários');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar horários:', error);
    throw error;
  }
}

// Salvar/Atualizar horário
async function salvarHorario(dia, horario, materia) {
  try {
    const response = await fetch(`${API_URL}/horarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ dia, horario, materia })
    });

    if (!response.ok) {
      throw new Error('Erro ao salvar horário');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao salvar horário:', error);
    throw error;
  }
}

// Resetar horário
async function resetarHorario(id) {
  try {
    const response = await fetch(`${API_URL}/horarios/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao resetar horário');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao resetar horário:', error);
    throw error;
  }
}