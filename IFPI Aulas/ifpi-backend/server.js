// server.js - Servidor Principal do IFPI Aulas
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== CONEXÃO COM MONGODB ====================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ifpi-aulas')
.then(() => console.log('✅ Conectado ao MongoDB'))
.catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// ==================== SCHEMAS E MODELS ====================

// Schema de Usuário (Aluno e Professor)
const usuarioSchema = new mongoose.Schema({
  matricula: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  nome: { type: String, required: true },
  tipo: { type: String, enum: ['aluno', 'professor'], required: true },
  email: String,
  materias: [String], // Para professores
  turma: {
    curso: String,
    serie: String
  }, // Para alunos
  criadoEm: { type: Date, default: Date.now }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

// Schema de Matéria
const materiaSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  nome: { type: String, required: true },
  professorMatricula: { type: String, required: true },
  professorNome: String,
  aulas: [{
    titulo: String,
    descricao: String,
    data: String,
    horario: String,
    criadoEm: { type: Date, default: Date.now }
  }],
  videoAulas: [{
    titulo: String,
    descricao: String,
    link: String,
    duracao: String,
    criadoEm: { type: Date, default: Date.now }
  }],
  tarefas: [{
    titulo: String,
    descricao: String,
    dataEntrega: String,
    pontos: Number,
    criadoEm: { type: Date, default: Date.now }
  }],
  materiais: [{
    titulo: String,
    descricao: String,
    tipo: String,
    link: String,
    criadoEm: { type: Date, default: Date.now }
  }],
  notas: [{
    nomeAluno: String,
    nota1: { type: Number, default: 0 },
    nota2: { type: Number, default: 0 },
    nota3: { type: Number, default: 0 },
    nota4: { type: Number, default: 0 }
  }]
});

const Materia = mongoose.model('Materia', materiaSchema);

// Schema de Calendário
const calendarioSchema = new mongoose.Schema({
  dia: String,
  horario: String,
  materia: String,
  professor: String,
  matriculaProfessor: String,
  status: { type: String, enum: ['ocupado', 'vago'], default: 'ocupado' },
  matriculaOriginal: String
});

const Calendario = mongoose.model('Calendario', calendarioSchema);

// Schema de Portal Educacional (Notícias)
const noticiaSchema = new mongoose.Schema({
  titulo: String,
  descricao: String,
  categoria: { type: String, enum: ['evento', 'olimpiada', 'concurso', 'aviso'] },
  data: String,
  autor: String,
  autorMatricula: String,
  criadoEm: { type: Date, default: Date.now }
});

const Noticia = mongoose.model('Noticia', noticiaSchema);

// Schema de Área ENEM
const enemSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['videoAula', 'material'] },
  titulo: String,
  descricao: String,
  link: String,
  duracao: String, // Para vídeos
  tipoMaterial: String, // Para materiais (PDF, Slides, etc)
  professorMatricula: String,
  criadoEm: { type: Date, default: Date.now }
});

const Enem = mongoose.model('Enem', enemSchema);

// Schema de Grupos de Estudo
const grupoEstudoSchema = new mongoose.Schema({
  nome: String,
  materia: String,
  descricao: String,
  criadorMatricula: String,
  membros: [String],
  maxMembros: { type: Number, default: 10 },
  mensagens: [{
    remetente: String,
    remetenteNome: String,
    texto: String,
    timestamp: { type: Date, default: Date.now },
    editado: { type: Boolean, default: false },
    poll: {
      pergunta: String,
      opcoes: [{
        texto: String,
        votos: { type: Number, default: 0 }
      }]
    }
  }],
  criadoEm: { type: Date, default: Date.now }
});

const GrupoEstudo = mongoose.model('GrupoEstudo', grupoEstudoSchema);

// Schema de Suporte
const suporteSchema = new mongoose.Schema({
  tipo: String,
  assunto: String,
  descricao: String,
  prioridade: { type: String, enum: ['baixa', 'media', 'alta'] },
  status: { type: String, enum: ['aberto', 'em-andamento', 'resolvido'], default: 'aberto' },
  usuarioMatricula: String,
  usuarioNome: String,
  usuarioTipo: String,
  criadoEm: { type: Date, default: Date.now }
});

const Suporte = mongoose.model('Suporte', suporteSchema);

// Schema de Horários de Estudo
const horarioEstudoSchema = new mongoose.Schema({
    usuario: {
        type: String,
        required: true
    },
    dia: {
        type: String,
        required: true,
        enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta']
    },
    horario: {
        type: String,
        required: true
    },
    materia: {
        type: String,
        default: 'Horário Livre'
    },
    tipo: {
        type: String,
        enum: ['fixed', 'free', 'break'],
        default: 'free'
    },
    editavel: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

horarioEstudoSchema.index({ usuario: 1, dia: 1, horario: 1 }, { unique: true });

const HorarioEstudo = mongoose.model('HorarioEstudo', horarioEstudoSchema);

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido.' });
  }
};

// ==================== ROTAS DE AUTENTICAÇÃO ====================

// Rota de Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { matricula, senha, tipo, curso, serie } = req.body;
    
    // Busca usuário
    let usuario = await Usuario.findOne({ matricula });
    
    // Se não existe, verifica se é login de teste dos professores
    if (!usuario && tipo === 'professor') {
      const professorPadrao = getProfessorPadrao(matricula);
      if (professorPadrao) {
        // Cria o professor no banco
        const senhaHash = await bcrypt.hash('123456', 10);
        usuario = new Usuario({
          matricula: matricula,
          senha: senhaHash,
          nome: professorPadrao.name,
          tipo: 'professor',
          materias: professorPadrao.subjects
        });
        await usuario.save();
      }
    }
    
    if (!usuario) {
      return res.status(401).json({ error: 'Matrícula não encontrada' });
    }
    
    // Verifica senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    // Gera token JWT
    const token = jwt.sign(
      { 
        matricula: usuario.matricula, 
        tipo: usuario.tipo,
        nome: usuario.nome 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      usuario: {
        matricula: usuario.matricula,
        nome: usuario.nome,
        tipo: usuario.tipo,
        materias: usuario.materias,
        turma: usuario.turma
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login', details: error.message });
  }
});

// Função auxiliar para professores padrão
function getProfessorPadrao(matricula) {
  const professores = {
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
  return professores[matricula];
}

// Rota de Registro (opcional - para criar novos usuários)
app.post('/api/auth/registro', async (req, res) => {
  try {
    const { matricula, senha, nome, tipo, materias, turma, email } = req.body;
    
    // Verifica se já existe
    const usuarioExistente = await Usuario.findOne({ matricula });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Matrícula já cadastrada' });
    }
    
    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);
    
    // Cria novo usuário
    const novoUsuario = new Usuario({
      matricula,
      senha: senhaHash,
      nome,
      tipo,
      email,
      materias: tipo === 'professor' ? materias : [],
      turma: tipo === 'aluno' ? turma : null
    });
    
    await novoUsuario.save();
    
    res.status(201).json({ message: 'Usuário criado com sucesso' });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário', details: error.message });
  }
});

// ==================== ROTAS DE MATÉRIAS ====================

// Buscar todas as matérias de um professor
app.get('/api/materias', auth, async (req, res) => {
  try {
    const materias = await Materia.find({ professorMatricula: req.usuario.matricula });
    res.json(materias);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar matérias' });
  }
});

// Buscar matéria específica
app.get('/api/materias/:codigo', auth, async (req, res) => {
  try {
    const materia = await Materia.findOne({ codigo: req.params.codigo });
    if (!materia) {
      return res.status(404).json({ error: 'Matéria não encontrada' });
    }
    res.json(materia);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar matéria' });
  }
});

// Adicionar conteúdo em uma matéria
app.post('/api/materias/:codigo/:tipo', auth, async (req, res) => {
  try {
    const { codigo, tipo } = req.params;
    const conteudo = req.body;
    
    let materia = await Materia.findOne({ codigo });
    
    if (!materia) {
      materia = new Materia({
        codigo,
        nome: codigo,
        professorMatricula: req.usuario.matricula,
        professorNome: req.usuario.nome
      });
    }
    
    if (tipo === 'aulas') materia.aulas.push(conteudo);
    else if (tipo === 'videoAulas') materia.videoAulas.push(conteudo);
    else if (tipo === 'tarefas') materia.tarefas.push(conteudo);
    else if (tipo === 'materiais') materia.materiais.push(conteudo);
    else if (tipo === 'notas') materia.notas.push(conteudo);
    
    await materia.save();
    res.json(materia);
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar conteúdo' });
  }
});

// Deletar conteúdo de uma matéria
// Deletar conteúdo de uma matéria
app.delete('/api/materias/:codigo/:tipo/:id', auth, async (req, res) => {
  try {
    const { codigo, tipo, id } = req.params;
    const materia = await Materia.findOne({ codigo });
    
    if (!materia) {
      return res.status(404).json({ error: 'Matéria não encontrada' });
    }
    
    // Remove o item filtrando pelo _id
    if (tipo === 'aulas') {
      materia.aulas = materia.aulas.filter(item => item._id.toString() !== id);
    } else if (tipo === 'videoAulas') {
      materia.videoAulas = materia.videoAulas.filter(item => item._id.toString() !== id);
    } else if (tipo === 'tarefas') {
      materia.tarefas = materia.tarefas.filter(item => item._id.toString() !== id);
    } else if (tipo === 'materiais') {
      materia.materiais = materia.materiais.filter(item => item._id.toString() !== id);
    } else if (tipo === 'notas') {
      materia.notas = materia.notas.filter(item => item._id.toString() !== id);
    }
    
    await materia.save();
    res.json({ message: 'Conteúdo deletado com sucesso' });
    
  } catch (error) {
    console.error('Erro ao deletar:', error);
    res.status(500).json({ error: 'Erro ao deletar conteúdo', details: error.message });
  }
});

// ==================== ROTAS DO CALENDÁRIO ====================

// Buscar calendário completo
app.get('/api/calendario', async (req, res) => {
  try {
    const calendario = await Calendario.find();
    res.json(calendario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar calendário' });
  }
});

// Criar horário no calendário (para popular)
app.post('/api/calendario/criar', auth, async (req, res) => {
  try {
    const horario = new Calendario(req.body);
    await horario.save();
    res.status(201).json(horario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar horário' });
  }
});

// Marcar horário como vago (falta do professor)
app.put('/api/calendario/marcar-falta', auth, async (req, res) => {
  try {
    const { dia, horario } = req.body;
    
    const aula = await Calendario.findOne({ 
      dia, 
      horario, 
      matriculaProfessor: req.usuario.matricula 
    });
    
    if (!aula) {
      return res.status(404).json({ error: 'Aula não encontrada ou você não tem permissão' });
    }
    
    aula.status = 'vago';
    aula.matriculaOriginal = req.usuario.matricula;
    await aula.save();
    
    res.json({ message: 'Horário marcado como vago', aula });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar falta' });
  }
});

// Ocupar horário vago
app.post('/api/calendario/ocupar-horario', auth, async (req, res) => {
  try {
    const { dia, horario, materia } = req.body;
    
    let aulaExistente = await Calendario.findOne({ dia, horario });
    
    // Verifica se já está ocupado
    if (aulaExistente && aulaExistente.status === 'ocupado') {
      return res.status(400).json({ error: 'Horário já está ocupado' });
    }
    
    // Verifica se o professor que faltou está tentando ocupar de novo
    if (aulaExistente && aulaExistente.matriculaOriginal === req.usuario.matricula) {
      return res.status(400).json({ error: 'Você não pode ocupar um horário que você mesmo marcou como falta' });
    }
    
    if (aulaExistente) {
      // Atualiza horário existente
      aulaExistente.status = 'ocupado';
      aulaExistente.materia = materia;
      aulaExistente.professor = req.usuario.nome;
      aulaExistente.matriculaProfessor = req.usuario.matricula;
      await aulaExistente.save();
      res.json({ message: 'Horário ocupado com sucesso', aula: aulaExistente });
    } else {
      // Cria novo horário
      const novaAula = new Calendario({
        dia,
        horario,
        materia,
        professor: req.usuario.nome,
        matriculaProfessor: req.usuario.matricula,
        status: 'ocupado'
      });
      await novaAula.save();
      res.json({ message: 'Horário criado com sucesso', aula: novaAula });
    }
    
  } catch (error) {
    console.error('Erro ao ocupar horário:', error);
    res.status(500).json({ error: 'Erro ao ocupar horário' });
  }
});

// ==================== ROTAS DO PORTAL EDUCACIONAL ====================

// Buscar todas as notícias
app.get('/api/noticias', async (req, res) => {
  try {
    const { categoria } = req.query;
    const query = categoria && categoria !== 'todos' ? { categoria } : {};
    const noticias = await Noticia.find(query).sort({ criadoEm: -1 });
    res.json(noticias);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar notícias' });
  }
});

// Criar notícia
app.post('/api/noticias', auth, async (req, res) => {
  try {
    const noticia = new Noticia({
      ...req.body,
      autor: req.usuario.nome,
      autorMatricula: req.usuario.matricula
    });
    await noticia.save();
    res.status(201).json(noticia);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar notícia' });
  }
});

// Deletar notícia
app.delete('/api/noticias/:id', auth, async (req, res) => {
  try {
    await Noticia.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notícia deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar notícia' });
  }
});

// ==================== ROTAS DA ÁREA ENEM ====================

// Buscar conteúdo ENEM
app.get('/api/enem/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;
    const conteudo = await Enem.find({ tipo }).sort({ criadoEm: -1 });
    res.json(conteudo);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conteúdo ENEM' });
  }
});

// Criar conteúdo ENEM
app.post('/api/enem', auth, async (req, res) => {
  try {
    const conteudo = new Enem({
      ...req.body,
      professorMatricula: req.usuario.matricula
    });
    await conteudo.save();
    res.status(201).json(conteudo);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar conteúdo ENEM' });
  }
});

// Deletar conteúdo ENEM
app.delete('/api/enem/:id', auth, async (req, res) => {
  try {
    await Enem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Conteúdo ENEM deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar conteúdo ENEM' });
  }
});

// ==================== ROTAS DE GRUPOS DE ESTUDO ====================

// Buscar todos os grupos
app.get('/api/grupos', auth, async (req, res) => {
  try {
    const grupos = await GrupoEstudo.find().sort({ criadoEm: -1 });
    res.json(grupos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar grupos' });
  }
});

// Criar grupo
app.post('/api/grupos', auth, async (req, res) => {
  try {
    const grupo = new GrupoEstudo({
      ...req.body,
      criadorMatricula: req.usuario.matricula,
      membros: [req.usuario.matricula]
    });
    await grupo.save();
    res.status(201).json(grupo);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar grupo' });
  }
});

// Entrar/Sair do grupo
app.put('/api/grupos/:id/toggle-membro', auth, async (req, res) => {
  try {
    const grupo = await GrupoEstudo.findById(req.params.id);
    
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }
    
    const isMembro = grupo.membros.includes(req.usuario.matricula);
    
    if (isMembro) {
      grupo.membros = grupo.membros.filter(m => m !== req.usuario.matricula);
    } else {
      if (grupo.membros.length >= grupo.maxMembros) {
        return res.status(400).json({ error: 'Grupo está cheio' });
      }
      grupo.membros.push(req.usuario.matricula);
    }
    
    await grupo.save();
    res.json(grupo);
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao entrar/sair do grupo' });
  }
});

// Enviar mensagem no grupo
app.post('/api/grupos/:id/mensagens', auth, async (req, res) => {
  try {
    const grupo = await GrupoEstudo.findById(req.params.id);
    
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }
    
    if (!grupo.membros.includes(req.usuario.matricula)) {
      return res.status(403).json({ error: 'Você não é membro deste grupo' });
    }
    
    grupo.mensagens.push({
      remetente: req.usuario.matricula,
      remetenteNome: req.usuario.nome,
      ...req.body
    });
    
    await grupo.save();
    res.json(grupo);
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// ==================== ROTAS DE SUPORTE ====================

// Buscar tickets de suporte
app.get('/api/suporte', auth, async (req, res) => {
  try {
    const tickets = await Suporte.find({ usuarioMatricula: req.usuario.matricula }).sort({ criadoEm: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tickets' });
  }
});

// Criar ticket de suporte
app.post('/api/suporte', auth, async (req, res) => {
  try {
    const ticket = new Suporte({
      ...req.body,
      usuarioMatricula: req.usuario.matricula,
      usuarioNome: req.usuario.nome,
      usuarioTipo: req.usuario.tipo
    });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar ticket' });
  }
});

// Deletar ticket
app.delete('/api/suporte/:id', auth, async (req, res) => {
  try {
    await Suporte.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar ticket' });
  }
});

// ==================== ROTAS DE HORÁRIOS DE ESTUDO ====================

// Buscar horários do aluno
app.get('/api/horarios', auth, async (req, res) => {
  try {
    const horarios = await HorarioEstudo.find({ usuario: req.usuario.matricula });
    res.json(horarios);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar horários' });
  }
});

// Salvar/Atualizar horário
app.post('/api/horarios', auth, async (req, res) => {
  try {
    const { dia, horario, materia } = req.body;
    
    // Busca se já existe
    let horarioExistente = await HorarioEstudo.findOne({
      usuario: req.usuario.matricula,
      dia,
      horario
    });
    
    if (horarioExistente) {
      // Atualiza
      horarioExistente.materia = materia;
      await horarioExistente.save();
      res.json(horarioExistente);
    } else {
      // Cria novo
      const novoHorario = new HorarioEstudo({
        usuario: req.usuario.matricula,
        dia,
        horario,
        materia
      });
      await novoHorario.save();
      res.status(201).json(novoHorario);
    }
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar horário', details: error.message });
  }
});

// Deletar horário (resetar para "Horário Livre")
app.delete('/api/horarios/:id', auth, async (req, res) => {
  try {
    await HorarioEstudo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Horário resetado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar horário' });
  }
});



// ==================== ROTA DE TESTE ====================
app.get('/', (req, res) => {
  res.json({ message: '🎓 API IFPI Aulas funcionando!' });
});

// ==================== INICIALIZAR SERVIDOR ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Acesse: http://localhost:${PORT}`);
});



// Criar horário no calendário (para popular)
app.post('/api/calendario/criar', auth, async (req, res) => {
  try {
    const horario = new Calendario(req.body);
    await horario.save();
    res.status(201).json(horario);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar horário' });
  }
});

// ==================== ROTA PARA CADASTRAR TODOS OS PROFESSORES ====================
app.post('/api/auth/cadastrar-professores', async (req, res) => {
  try {
    const professores = [
      { matricula: '202412345', senha: '123456', nome: 'Prof. Gilson', materias: ['matematica'] },
      { matricula: '202412346', senha: '123456', nome: 'Profa. Lily', materias: ['portugues'] },
      { matricula: '202412347', senha: '123456', nome: 'Prof. William', materias: ['fisica'] },
      { matricula: '202412348', senha: '123456', nome: 'Prof. Renato', materias: ['quimica'] },
      { matricula: '202412349', senha: '123456', nome: 'Prof. Rafael', materias: ['biologia'] },
      { matricula: '202412350', senha: '123456', nome: 'Profa. Patrícia', materias: ['historia'] },
      { matricula: '202412351', senha: '123456', nome: 'Prof. Neto', materias: ['geografia'] },
      { matricula: '202412352', senha: '123456', nome: 'Profa. Lucy', materias: ['ingles'] },
      { matricula: '202412353', senha: '123456', nome: 'Prof. Cleomir', materias: ['espanhol'] },
      { matricula: '202412354', senha: '123456', nome: 'Profa. Jotinha', materias: ['filosofia'] },
      { matricula: '202412355', senha: '123456', nome: 'Profa. Millene', materias: ['sociologia'] },
      { matricula: '202412356', senha: '123456', nome: 'Prof. Cibely', materias: ['educacao-fisica'] }
    ];
    
    let cadastrados = 0;
    let jaExistiam = 0;
    
    for (const prof of professores) {
      // Verifica se já existe
      const existe = await Usuario.findOne({ matricula: prof.matricula });
      
      if (!existe) {
        // Criptografa a senha
        const senhaHash = await bcrypt.hash(prof.senha, 10);
        
        // Cria o professor
        const novoProfessor = new Usuario({
          matricula: prof.matricula,
          senha: senhaHash,
          nome: prof.nome,
          tipo: 'professor',
          materias: prof.materias
        });
        
        await novoProfessor.save();
        cadastrados++;
      } else {
        jaExistiam++;
      }
    }
    
    res.json({ 
      message: '✅ Professores cadastrados!',
      cadastrados,
      jaExistiam,
      total: professores.length
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar professores', details: error.message });
  }
});

// ==================== ROTA PARA CADASTRAR ALUNOS ====================
app.post('/api/auth/cadastrar-alunos', async (req, res) => {
  try {
    const alunos = [
      { 
        matricula: '2024123ISINF0028', 
        senha: '123456', 
        nome: 'Felipe Alves',
        email: 'felipe.alves@aluno.ifpi.edu.br'
      },
      { 
        matricula: '2024123ISINF0021', 
        senha: '123456', 
        nome: 'Daniel',
        email: 'daniel@aluno.ifpi.edu.br'
      },
      { 
        matricula: '2024123ISINF0035', 
        senha: '123456', 
        nome: 'João Emanoel',
        email: 'joao.emanoel@aluno.ifpi.edu.br'
      },
      { 
        matricula: '2024123ISINF0036', 
        senha: '123456', 
        nome: 'Adriano',
        email: 'adriano@aluno.ifpi.edu.br'
      }
    ];
    
    let cadastrados = 0;
    let jaExistiam = 0;
    
    for (const aluno of alunos) {
      // Verifica se já existe
      const existe = await Usuario.findOne({ matricula: aluno.matricula });
      
      if (!existe) {
        // Criptografa a senha
        const senhaHash = await bcrypt.hash(aluno.senha, 10);
        
        // Cria o aluno
        const novoAluno = new Usuario({
          matricula: aluno.matricula,
          senha: senhaHash,
          nome: aluno.nome,
          tipo: 'aluno',
          email: aluno.email
        });
        
        await novoAluno.save();
        cadastrados++;
      } else {
        jaExistiam++;
      }
    }
    
    res.json({ 
      message: '✅ Alunos cadastrados!',
      cadastrados,
      jaExistiam,
      total: alunos.length
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar alunos', details: error.message });
  }
});

// ==================== ROTA PARA POPULAR O CALENDÁRIO ====================
app.post('/api/calendario/popular', async (req, res) => {
  try {
    // Limpa tudo antes
    await Calendario.deleteMany({});
    
    const calendarioCompleto = [
        // SEGUNDA-FEIRA
        { dia: 'segunda', horario: '07:00 - 08:00', materia: 'biologia', professor: 'Prof. Rafael', matriculaProfessor: '202412349', status: 'ocupado' },
        { dia: 'segunda', horario: '08:00 - 09:00', materia: 'biologia', professor: 'Prof. Rafael', matriculaProfessor: '202412349', status: 'ocupado' },
        { dia: 'segunda', horario: '09:00 - 10:00', materia: 'historia', professor: 'Profa. Patrícia', matriculaProfessor: '202412350', status: 'ocupado' },
        { dia: 'segunda', horario: '10:20 - 11:20', materia: 'geografia', professor: 'Prof. Neto', matriculaProfessor: '202412351', status: 'ocupado' },
        { dia: 'segunda', horario: '11:20 - 12:20', materia: 'educacao-fisica', professor: 'Profa. Cibely', matriculaProfessor: '202412356', status: 'ocupado' },
        
        // TERÇA-FEIRA
        { dia: 'terca', horario: '07:00 - 08:00', materia: 'ingles', professor: 'Prof. Lucy', matriculaProfessor: '202412352', status: 'ocupado' },
        { dia: 'terca', horario: '08:00 - 09:00', materia: 'ingles', professor: 'Prof. Lucy', matriculaProfessor: '202412352', status: 'ocupado' },
        { dia: 'terca', horario: '09:00 - 10:00', materia: 'geografia', professor: 'Prof. Neto', matriculaProfessor: '202412351', status: 'ocupado' },
        { dia: 'terca', horario: '10:20 - 11:20', materia: 'espanhol', professor: 'Prof. Cleomir', matriculaProfessor: '202412353', status: 'ocupado' },
        { dia: 'terca', horario: '11:20 - 12:20', materia: 'espanhol', professor: 'Prof. Cleomir', matriculaProfessor: '202412353', status: 'ocupado' },
        
        // QUARTA-FEIRA
        { dia: 'quarta', horario: '07:00 - 08:00', materia: 'fisica', professor: 'Prof. William', matriculaProfessor: '202412347', status: 'ocupado' },
        { dia: 'quarta', horario: '08:00 - 09:00', materia: 'fisica', professor: 'Prof. William', matriculaProfessor: '202412347', status: 'ocupado' },
        { dia: 'quarta', horario: '09:00 - 10:00', materia: 'portugues', professor: 'Profa. Lily', matriculaProfessor: '202412346', status: 'ocupado' },
        { dia: 'quarta', horario: '10:20 - 11:20', materia: 'portugues', professor: 'Profa. Lily', matriculaProfessor: '202412346', status: 'ocupado' },
        { dia: 'quarta', horario: '11:20 - 12:20', materia: 'portugues', professor: 'Profa. Lily', matriculaProfessor: '202412346', status: 'ocupado' },
        
        // QUINTA-FEIRA
        { dia: 'quinta', horario: '07:00 - 08:00', materia: 'quimica', professor: 'Prof. Renato', matriculaProfessor: '202412348', status: 'ocupado' },
        { dia: 'quinta', horario: '08:00 - 09:00', materia: 'quimica', professor: 'Prof. Renato', matriculaProfessor: '202412348', status: 'ocupado' },
        { dia: 'quinta', horario: '09:00 - 10:00', materia: 'historia', professor: 'Profa. Patrícia', matriculaProfessor: '202412350', status: 'ocupado' },
        { dia: 'quinta', horario: '10:20 - 11:20', materia: 'Matematica', professor: 'Prof. Gilson', matriculaProfessor: '202412345', status: 'ocupado' },
        { dia: 'quinta', horario: '11:20 - 12:20', materia: 'Matematica', professor: 'Prof. Gilson', matriculaProfessor: '202412345', status: 'ocupado' },
        
        // SEXTA-FEIRA
        { dia: 'sexta', horario: '07:00 - 08:00', materia: 'Matematica', professor: 'Prof. Gilson', matriculaProfessor: '202412345', status: 'ocupado' },
        { dia: 'sexta', horario: '08:00 - 09:00', materia: 'filosofia', professor: 'Prof. Jotinha', matriculaProfessor: '202412354', status: 'ocupado' },
        { dia: 'sexta', horario: '09:00 - 10:00', materia: 'sociologia', professor: 'Prof. Milene', matriculaProfessor: '202412355', status: 'ocupado' },
        { dia: 'sexta', horario: '10:20 - 11:20', materia: 'quimica', professor: 'Prof. Renato', matriculaProfessor: '202412348', status: 'ocupado' },
        { dia: 'sexta', horario: '11:20 - 12:20', materia: 'biologia', professor: 'Prof. Rafael', matriculaProfessor: '202412349', status: 'ocupado' }
    ];
    
    await Calendario.insertMany(calendarioCompleto);
    
    res.json({ message: '✅ Calendário populado!', total: calendarioCompleto.length });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao popular calendário' });
  }
});
// ==================== ROTA GET PARA POPULAR O CALENDÁRIO ====================
app.get('/api/calendario/popular', async (req, res) => {
  try {
    // Limpa tudo antes
    await Calendario.deleteMany({});
    
    const calendarioCompleto = [
        // SEGUNDA-FEIRA
        { dia: 'segunda', horario: '07:00 - 08:00', materia: 'biologia', professor: 'Prof. Rafael', matriculaProfessor: '202412349', status: 'ocupado' },
        { dia: 'segunda', horario: '08:00 - 09:00', materia: 'biologia', professor: 'Prof. Rafael', matriculaProfessor: '202412349', status: 'ocupado' },
        { dia: 'segunda', horario: '09:00 - 10:00', materia: 'historia', professor: 'Profa. Patrícia', matriculaProfessor: '202412350', status: 'ocupado' },
        { dia: 'segunda', horario: '10:20 - 11:20', materia: 'geografia', professor: 'Prof. Neto', matriculaProfessor: '202412351', status: 'ocupado' },
        { dia: 'segunda', horario: '11:20 - 12:20', materia: 'educacao-fisica', professor: 'Profa. Cibely', matriculaProfessor: '202412356', status: 'ocupado' },
        
        // TERÇA-FEIRA
        { dia: 'terca', horario: '07:00 - 08:00', materia: 'ingles', professor: 'Prof. Lucy', matriculaProfessor: '202412352', status: 'ocupado' },
        { dia: 'terca', horario: '08:00 - 09:00', materia: 'ingles', professor: 'Prof. Lucy', matriculaProfessor: '202412352', status: 'ocupado' },
        { dia: 'terca', horario: '09:00 - 10:00', materia: 'geografia', professor: 'Prof. Neto', matriculaProfessor: '202412351', status: 'ocupado' },
        { dia: 'terca', horario: '10:20 - 11:20', materia: 'espanhol', professor: 'Prof. Cleomir', matriculaProfessor: '202412353', status: 'ocupado' },
        { dia: 'terca', horario: '11:20 - 12:20', materia: 'espanhol', professor: 'Prof. Cleomir', matriculaProfessor: '202412353', status: 'ocupado' },
        
        // QUARTA-FEIRA
        { dia: 'quarta', horario: '07:00 - 08:00', materia: 'fisica', professor: 'Prof. William', matriculaProfessor: '202412347', status: 'ocupado' },
        { dia: 'quarta', horario: '08:00 - 09:00', materia: 'fisica', professor: 'Prof. William', matriculaProfessor: '202412347', status: 'ocupado' },
        { dia: 'quarta', horario: '09:00 - 10:00', materia: 'portugues', professor: 'Profa. Lily', matriculaProfessor: '202412346', status: 'ocupado' },
        { dia: 'quarta', horario: '10:20 - 11:20', materia: 'portugues', professor: 'Profa. Lily', matriculaProfessor: '202412346', status: 'ocupado' },
        { dia: 'quarta', horario: '11:20 - 12:20', materia: 'portugues', professor: 'Profa. Lily', matriculaProfessor: '202412346', status: 'ocupado' },
        
        // QUINTA-FEIRA
        { dia: 'quinta', horario: '07:00 - 08:00', materia: 'quimica', professor: 'Prof. Renato', matriculaProfessor: '202412348', status: 'ocupado' },
        { dia: 'quinta', horario: '08:00 - 09:00', materia: 'quimica', professor: 'Prof. Renato', matriculaProfessor: '202412348', status: 'ocupado' },
        { dia: 'quinta', horario: '09:00 - 10:00', materia: 'historia', professor: 'Profa. Patrícia', matriculaProfessor: '202412350', status: 'ocupado' },
        { dia: 'quinta', horario: '10:20 - 11:20', materia: 'matematica', professor: 'Prof. Gilson', matriculaProfessor: '202412345', status: 'ocupado' },
        { dia: 'quinta', horario: '11:20 - 12:20', materia: 'matematica', professor: 'Prof. Gilson', matriculaProfessor: '202412345', status: 'ocupado' },
        
        // SEXTA-FEIRA
        { dia: 'sexta', horario: '07:00 - 08:00', materia: 'matematica', professor: 'Prof. Gilson', matriculaProfessor: '202412345', status: 'ocupado' },
        { dia: 'sexta', horario: '08:00 - 09:00', materia: 'filosofia', professor: 'Prof. Jotinha', matriculaProfessor: '202412354', status: 'ocupado' },
        { dia: 'sexta', horario: '09:00 - 10:00', materia: 'sociologia', professor: 'Prof. Milene', matriculaProfessor: '202412355', status: 'ocupado' },
        { dia: 'sexta', horario: '10:20 - 11:20', materia: 'quimica', professor: 'Prof. Renato', matriculaProfessor: '202412348', status: 'ocupado' },
        { dia: 'sexta', horario: '11:20 - 12:20', materia: 'biologia', professor: 'Prof. Rafael', matriculaProfessor: '202412349', status: 'ocupado' }
    ];
    
    await Calendario.insertMany(calendarioCompleto);
    
    res.json({ message: '✅ Calendário populado!', total: calendarioCompleto.length });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao popular calendário' });
  }
});

// ==================== ROTA GET PARA CADASTRAR ALUNOS ====================
app.get('/api/auth/cadastrar-alunos', async (req, res) => {
  try {
    const alunos = [
      { 
        matricula: '2024123ISINF0028', 
        senha: '123456', 
        nome: 'Felipe Alves',
        email: 'felipe.alves@aluno.ifpi.edu.br'
      },
      { 
        matricula: '2024123ISINF0021', 
        senha: '123456', 
        nome: 'Daniel',
        email: 'daniel@aluno.ifpi.edu.br'
      },
      { 
        matricula: '2024123ISINF0035', 
        senha: '123456', 
        nome: 'João Emanoel',
        email: 'joao.emanoel@aluno.ifpi.edu.br'
      },
      { 
        matricula: '2024123ISINF0036', 
        senha: '123456', 
        nome: 'Adriano',
        email: 'adriano@aluno.ifpi.edu.br'
      }
    ];
    
    let cadastrados = 0;
    let jaExistiam = 0;
    
    for (const aluno of alunos) {
      // Verifica se já existe
      const existe = await Usuario.findOne({ matricula: aluno.matricula });
      
      if (!existe) {
        // Criptografa a senha
        const senhaHash = await bcrypt.hash(aluno.senha, 10);
        
        // Cria o aluno
        const novoAluno = new Usuario({
          matricula: aluno.matricula,
          senha: senhaHash,
          nome: aluno.nome,
          tipo: 'aluno',
          email: aluno.email
        });
        
        await novoAluno.save();
        cadastrados++;
      } else {
        jaExistiam++;
      }
    }
    
    res.json({ 
      message: '✅ Alunos cadastrados!',
      cadastrados,
      jaExistiam,
      total: alunos.length
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar alunos', details: error.message });
  }
});