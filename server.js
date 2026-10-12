require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const multer = require('multer');
const Database = require('better-sqlite3');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(PUBLIC, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

const sessionSecret = process.env.SESSION_SECRET || '';
const adminUsername = process.env.ADMIN_USERNAME || '';
const adminPassword = process.env.ADMIN_PASSWORD || '';
if (process.env.NODE_ENV === 'production' && (sessionSecret.length < 32 || adminPassword.length < 12 || !adminUsername || adminPassword === 'troque-esta-senha-por-uma-forte')) {
  throw new Error('Configuração insegura: defina SESSION_SECRET, ADMIN_USERNAME e uma ADMIN_PASSWORD forte no .env.');
}
if (sessionSecret.length < 32 || adminPassword.length < 12 || !adminUsername || adminPassword === 'troque-esta-senha-por-uma-forte') {
  console.warn('\n[JD News] Configure .env com SESSION_SECRET (32+ caracteres), ADMIN_USERNAME e uma ADMIN_PASSWORD forte (12+ caracteres) antes de usar.\n');
}

const db = new Database(path.join(ROOT, 'jdnews.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);
const count = db.prepare('SELECT COUNT(*) AS total FROM articles').get().total;
if (count === 0) {
  const insert = db.prepare(`INSERT INTO articles (title, excerpt, category, author, body, image, featured, published, created_at, updated_at) VALUES (@title,@excerpt,@category,@author,@body,@image,@featured,1,@date,@date)`);
  const now = Date.now();
  const samples = [
    {title:'O que está em pauta no Brasil: os temas que movimentam o debate público',excerpt:'Uma visão geral dos assuntos que estão no centro das discussões políticas e sociais.',category:'Brasil',author:'Redação JD News',body:'O debate público reúne diferentes visões sobre os desafios do país. Acompanhar fontes confiáveis, consultar documentos e ouvir os envolvidos ajuda o leitor a formar sua própria opinião.\n\nEsta é uma publicação demonstrativa. Atualize o texto com apuração, informações verificadas e fontes identificadas antes de publicar.',featured:1,date:new Date(now).toISOString(),image:''},
    {title:'Educação em foco: estudantes discutem prioridades para o futuro',excerpt:'Investimentos, permanência estudantil e qualidade do ensino estão entre os temas em debate.',category:'Política',author:'Redação JD News',body:'A educação continua sendo tema importante nas discussões públicas. Estudantes, educadores e gestores apresentam diferentes propostas sobre financiamento, acesso e qualidade do ensino.\n\nConteúdo demonstrativo. Acrescente apuração, dados e fontes antes de publicar.',featured:0,date:new Date(now-3600000).toISOString(),image:''},
    {title:'Economia no dia a dia: como decisões públicas chegam à população',excerpt:'Entenda por que políticas econômicas são acompanhadas de perto por famílias e empresas.',category:'Economia',author:'Redação JD News',body:'Decisões econômicas podem ter reflexos em preços, emprego, renda e serviços. Para compreender seus efeitos, é importante observar indicadores, prazos e diferentes grupos afetados.\n\nConteúdo demonstrativo. Atualize com dados e fontes atuais antes de publicar.',featured:0,date:new Date(now-7200000).toISOString(),image:''}
  ];
  const tx = db.transaction(rows => rows.forEach(row => insert.run(row)));
  tx(samples);
}

app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'blob:', 'https:'], scriptSrc: ["'self'"], connectSrc: ["'self'"] } } }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(session({
  name: 'jdnews.sid', secret: sessionSecret || crypto.randomBytes(48).toString('hex'),
  resave: false, saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: ROOT, table: 'sessions' }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(PUBLIC, { extensions: ['html'] }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' } });
const upload = multer({
  storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, UPLOADS), filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype))
});
const categories = new Set(['Política','Brasil','Mundo','Economia','Cultura','Esportes','Opinião','Tecnologia','Entretenimento']);
const publicFields = row => ({ id: row.id, title: row.title, excerpt: row.excerpt, category: row.category, author: row.author, body: row.body, image: row.image, featured: !!row.featured, date: row.created_at, updatedAt: row.updated_at });
const allArticles = db.prepare('SELECT * FROM articles WHERE published = 1 ORDER BY created_at DESC');
const getArticle = db.prepare('SELECT * FROM articles WHERE id = ?');
function requireAdmin(req, res, next) { if (req.session && req.session.admin === true) return next(); return res.status(401).json({ error: 'Faça login para continuar.' }); }
function validateArticle(body) {
  const fields = ['title','excerpt','category','author','body'];
  for (const key of fields) if (typeof body[key] !== 'string' || !body[key].trim()) return `Preencha o campo ${key}.`;
  if (body.title.trim().length > 140) return 'O título deve ter até 140 caracteres.';
  if (body.excerpt.trim().length > 300) return 'O subtítulo deve ter até 300 caracteres.';
  if (body.body.trim().length > 50000) return 'O texto ultrapassa o limite de 50 mil caracteres.';
  if (!categories.has(body.category)) return 'Selecione uma editoria válida.';
  return null;
}
app.get('/api/news', (_req, res) => res.json(allArticles.all().map(publicFields)));
app.get('/api/auth/me', (req, res) => res.json({ authenticated: !!(req.session && req.session.admin === true), username: req.session?.admin === true ? adminUsername : null }));
app.post('/api/auth/login', loginLimiter, (req, res, next) => {
  const username = String(req.body.username || ''); const password = String(req.body.password || '');
  if (!adminUsername || !adminPassword || adminPassword === 'troque-esta-senha-por-uma-forte') return res.status(503).json({ error: 'Configure as credenciais de administração no arquivo .env.' });
  if (username !== adminUsername || !safeCompare(password, adminPassword)) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  req.session.regenerate(err => { if (err) return next(err); req.session.admin = true; req.session.save(err2 => { if (err2) return next(err2); res.json({ ok: true }); }); });
});
function safeCompare(a,b) { const aa = crypto.createHash('sha256').update(a).digest(); const bb = crypto.createHash('sha256').update(b).digest(); return crypto.timingSafeEqual(aa, bb); }
app.post('/api/auth/logout', requireAdmin, (req, res, next) => req.session.destroy(err => { if (err) return next(err); res.clearCookie('jdnews.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }); res.json({ ok: true }); }));
app.get('/api/admin/news', requireAdmin, (_req, res) => res.json(db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all().map(publicFields)));
app.post('/api/admin/upload', requireAdmin, (req, res, next) => upload.single('image')(req, res, err => {
  if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter até 5 MB.' : 'Arquivo inválido. Use JPG, PNG, WEBP ou GIF.' });
  if (!req.file) return res.status(400).json({ error: 'Selecione uma imagem válida.' });
  res.json({ image: `/uploads/${req.file.filename}` });
}));
app.post('/api/admin/news', requireAdmin, (req, res) => {
  const error = validateArticle(req.body); if (error) return res.status(400).json({ error });
  const now = new Date().toISOString(); const featured = req.body.featured ? 1 : 0;
  const tx = db.transaction(() => { if (featured) db.prepare('UPDATE articles SET featured = 0').run(); const result = db.prepare('INSERT INTO articles (title,excerpt,category,author,body,image,featured,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)').run(req.body.title.trim(),req.body.excerpt.trim(),req.body.category,req.body.author.trim(),req.body.body.trim(),String(req.body.image || ''),featured,now,now); return getArticle.get(result.lastInsertRowid); });
  res.status(201).json(publicFields(tx()));
});
app.put('/api/admin/news/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id); const existing = getArticle.get(id); if (!existing) return res.status(404).json({ error: 'Notícia não encontrada.' });
  const error = validateArticle(req.body); if (error) return res.status(400).json({ error });
  const featured = req.body.featured ? 1 : 0; const now = new Date().toISOString();
  const tx = db.transaction(() => { if (featured) db.prepare('UPDATE articles SET featured = 0').run(); db.prepare('UPDATE articles SET title=?,excerpt=?,category=?,author=?,body=?,image=?,featured=?,updated_at=? WHERE id=?').run(req.body.title.trim(),req.body.excerpt.trim(),req.body.category,req.body.author.trim(),req.body.body.trim(),String(req.body.image || ''),featured,now,id); return getArticle.get(id); });
  res.json(publicFields(tx()));
});
app.delete('/api/admin/news/:id', requireAdmin, (req, res) => { const id = Number(req.params.id); const result = db.prepare('DELETE FROM articles WHERE id=?').run(id); if (!result.changes) return res.status(404).json({ error: 'Notícia não encontrada.' }); res.json({ ok: true }); });
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
app.use((err, _req, res, _next) => { console.error('[JD News]', err.message); res.status(500).json({ error: 'Ocorreu um erro interno. Tente novamente.' }); });
app.listen(PORT, () => console.log(`JD News disponível em http://localhost:${PORT}`));
