import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { neon } from "@neondatabase/serverless";
import { createServer as createViteServer } from "vite";
import bcrypt from "bcryptjs";

import cors from "cors";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable standard CORS handling
app.use(cors({
  origin: true,
  credentials: true
}));


// Serve large payload limits for attachments
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Database connection & fallback setups
const DATABASE_URL = process.env.DATABASE_URL;
let sql: any = null;
let useDatabase = false;

// Local fallback in-memory cache
let localUsers: any[] = [];
let localTickets: any[] = [];
let localHistory: any[] = [];
let localNotifications: any[] = [];

if (DATABASE_URL) {
  try {
    sql = neon(DATABASE_URL);
    useDatabase = true;
    console.log("Connected to Neon Serverless database.");
  } catch (err) {
    console.error("Failed to connect to Neon database, using in-memory fallback:", err);
  }
} else {
  console.log("DATABASE_URL is not set. Using local in-memory fallback.");
}

// Default Seed Data
const SEED_USERS = [
  { id: 'usr-1', nome: 'Keit Proativa', email: 'keit.proativacc@gmail.com', senha: '123', perfil: 'Administrador', empresa: 'Proativa', ativo: 'Sim' },
  { id: 'usr-2', nome: 'Elder Mendes', email: 'elder.mendes@proativacontactcenter.com.br', senha: '123', perfil: 'Administrador', empresa: 'Proativa', ativo: 'Sim' }
];

const SEED_TICKETS: any[] = [];
const SEED_HISTORY: any[] = [];
const SEED_NOTIFS: any[] = [];

// Database Schema creator and seed auto-runner
async function initializeDbSchema() {
  if (!useDatabase) {
    localUsers = [...SEED_USERS];
    localTickets = [...SEED_TICKETS];
    localHistory = [...SEED_HISTORY];
    localNotifications = [...SEED_NOTIFS];
    return;
  }

  try {
    console.log("Running PostgreSQL schema setup on Neon...");
    
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        perfil VARCHAR(50) NOT NULL,
        empresa VARCHAR(50) NOT NULL,
        ativo VARCHAR(10) DEFAULT 'Sim'
      )
    `;

    // Ensure senha column supports bcrypt hashes (60 chars) if changing from legacy plain-text schema
    try {
      await sql`ALTER TABLE usuarios ALTER COLUMN senha TYPE VARCHAR(255)`;
    } catch(e) {
      console.warn("Could not alter table during migration. Ignored.");
    }

    await sql`
      CREATE TABLE IF NOT EXISTS atendimentos (
        id VARCHAR(50) PRIMARY KEY,
        protocolo VARCHAR(50) NOT NULL UNIQUE,
        assunto VARCHAR(200) NOT NULL,
        categoria VARCHAR(100),
        descricao TEXT NOT NULL,
        solicitacao VARCHAR(100),
        empresa VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Aberto',
        data_abertura VARCHAR(50) NOT NULL,
        data_necessaria VARCHAR(50),
        data_retorno VARCHAR(50),
        data_encerramento VARCHAR(50),
        solicitante_id VARCHAR(50) NOT NULL,
        responsavel_id VARCHAR(50),
        parecer TEXT,
        anexo_nome VARCHAR(255),
        anexo_url TEXT,
        anexos TEXT DEFAULT '[]'
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS historico_atendimentos (
        id VARCHAR(50) PRIMARY KEY,
        atendimento_id VARCHAR(50) NOT NULL,
        usuario_id VARCHAR(50) NOT NULL,
        data_hora VARCHAR(50) NOT NULL,
        acao VARCHAR(100) NOT NULL,
        observacao TEXT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS notificacoes (
        id VARCHAR(50) PRIMARY KEY,
        usuario_id VARCHAR(50),
        perfil_alvo VARCHAR(50),
        titulo VARCHAR(150) NOT NULL,
        mensagem TEXT NOT NULL,
        data_hora VARCHAR(50) NOT NULL,
        protocolo VARCHAR(50),
        lida BOOLEAN DEFAULT FALSE,
        tipo VARCHAR(50) NOT NULL
      )
    `;

    const seededFilePath = path.join(process.cwd(), '.seeded');
    const hasAlreadySeeded = fs.existsSync(seededFilePath);

    if (!hasAlreadySeeded) {
      console.log("No .seeded marker found. Initializing database default seed data...");

      // Populate Users
      const uCount = await sql`SELECT COUNT(*)::int FROM usuarios`;
      if (uCount[0].count === 0) {
        console.log("Seeding default users to Neon...");
        for (const u of SEED_USERS) {
          const hashedSenha = bcrypt.hashSync(u.senha, 10);
          await sql`
            INSERT INTO usuarios (id, nome, email, senha, perfil, empresa, ativo)
            VALUES (${u.id}, ${u.nome}, ${u.email}, ${hashedSenha}, ${u.perfil}, ${u.empresa}, ${u.ativo})
            ON CONFLICT (email) DO NOTHING
          `;
        }
      }

      // Populate Tickets
      const tCount = await sql`SELECT COUNT(*)::int FROM atendimentos`;
      if (tCount[0].count === 0) {
        console.log("Seeding default tickets to Neon...");
        for (const t of SEED_TICKETS) {
          await sql`
            INSERT INTO atendimentos (
              id, protocolo, assunto, categoria, descricao, solicitacao, empresa, 
              status, data_abertura, data_necessaria, data_retorno, data_encerramento, 
              solicitante_id, responsavel_id, parecer, anexos
            )
            VALUES (
              ${t.id}, ${t.protocolo}, ${t.assunto}, ${t.solicitacao}, ${t.descricao}, ${t.solicitacao}, ${t.empresa},
              ${t.status}, ${t.data_abertura}, ${t.data_necessaria}, ${t.data_retorno}, ${t.data_encerramento}, 
              ${t.solicitante_id}, ${t.responsavel_id}, ${t.parecer}, ${t.anexos}
            )
          `;
        }
      }

      // Populate History
      const hCount = await sql`SELECT COUNT(*)::int FROM historico_atendimentos`;
      if (hCount[0].count === 0) {
        console.log("Seeding default histories to Neon...");
        for (const h of SEED_HISTORY) {
          await sql`
            INSERT INTO historico_atendimentos (id, atendimento_id, usuario_id, data_hora, acao, observacao)
            VALUES (${h.id}, ${h.atendimento_id}, ${h.usuario_id}, ${h.data_hora}, ${h.acao}, ${h.observacao})
          `;
        }
      }

      // Populate Notifications
      const nCount = await sql`SELECT COUNT(*)::int FROM notificacoes`;
      if (nCount[0].count === 0) {
        console.log("Seeding default notifications to Neon...");
        for (const n of SEED_NOTIFS) {
          await sql`
            INSERT INTO notificacoes (id, usuario_id, perfil_alvo, titulo, mensagem, data_hora, protocolo, lida, tipo)
            VALUES (${n.id}, ${n.usuario_id || null}, ${n.perfil_alvo || null}, ${n.titulo}, ${n.mensagem}, ${n.data_hora}, ${n.protocolo || null}, ${n.lida}, ${n.tipo})
          `;
        }
      }

      // Mark as seeded
      try {
        fs.writeFileSync(seededFilePath, 'true');
        console.log("Successfully created .seeded marker file.");
      } catch (fErr) {
        console.warn("Could not write .seeded marker file to filesystem:", fErr);
      }
    } else {
      console.log("Database already has .seeded marker. Skipping automatic default seeds to respect manual clear/wipes.");
    }

    console.log("Neon database tables schema check completed.");
  } catch (error) {
    console.error("Error setting up Neon tables. Falling back to local arrays.", error);
    useDatabase = false;
    localUsers = [...SEED_USERS];
    localTickets = [...SEED_TICKETS];
    localHistory = [...SEED_HISTORY];
    localNotifications = [...SEED_NOTIFS];
  }
}

// ----------------------
// API CUSTOM ENDPOINTS
// ----------------------

// Authentication Endpoint
app.post("/api/auth/login", async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) {
    return res.status(400).json({ error: "Credenciais inválidas" });
  }

  const targetName = login.trim().toLowerCase();

  try {
    let foundUser = null;
    if (useDatabase) {
      // Find by email or exact name match
      // In a real app we would use parameterization effectively
      const rows = await sql`SELECT * FROM usuarios WHERE LOWER(email) = ${targetName} OR LOWER(nome) = ${targetName}`;
      if (rows.length > 0) {
        foundUser = rows[0];
      }
    } else {
      foundUser = localUsers.find(u => u.nome.toLowerCase() === targetName || u.email.toLowerCase() === targetName);
    }

    if (!foundUser) {
      return res.status(401).json({ error: "Usuário/E-mail não cadastrado ou inválido." });
    }

    // Compare hashed password
    const isMatch = bcrypt.compareSync(senha, foundUser.senha);
    if (!isMatch && foundUser.senha !== senha) { // Support legacy plain-text during transition if needed, actually let's just use compare
      return res.status(401).json({ error: "Senha de acesso incorreta." });
    }

    if (foundUser.ativo === 'Não') {
      return res.status(403).json({ error: "Sua conta está inativa. Entre em contato com o Departamento Pessoal." });
    }

    // Do NOT send the password back to the frontend in a secure environment
    // Remove senha field before sending the user object
    const { senha: _, ...safeUser } = foundUser;
    const mustChangePassword = bcrypt.compareSync("123", foundUser.senha) || foundUser.senha === "123";
    return res.json({ user: { ...safeUser, mustChangePassword } });
  } catch (error) {
    return res.status(500).json({ error: "Erro no servidor ao tentar realizar login." });
  }
});

// Users Endpoints
app.get("/api/users", async (req, res) => {
  try {
    if (useDatabase) {
      const rows = await sql`SELECT id, nome, email, perfil, empresa, ativo FROM usuarios ORDER BY nome ASC`;
      return res.json(rows);
    }
    const safeUsers = localUsers.map(({ senha, ...u }) => u);
    return res.json(safeUsers);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (useDatabase) {
      const deleted = await sql`
        DELETE FROM usuarios 
        WHERE id = ${id}
        RETURNING id
      `;
      if (deleted.length === 0) return res.status(404).json({ error: "User not found" });
      return res.json({ success: true, id: deleted[0].id });
    } else {
      const index = localUsers.findIndex(u => u.id === id);
      if (index === -1) return res.status(404).json({ error: "User not found" });
      localUsers.splice(index, 1);
      return res.json({ success: true, id });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete user" });
  }
});

app.get("/api/test-db-connection", async (req, res) => {
  if (!useDatabase) {
    return res.status(400).json({ 
      success: false, 
      error: "Banco de dados não configurado (DATABASE_URL ausente).",
      details: "Verifique se a variável de ambiente DATABASE_URL foi definida corretamente no projeto."
    });
  }
  
  try {
    await sql`SELECT 1`;
    return res.json({ success: true, message: "Conexão com o banco de dados Neon estabelecida com sucesso." });
  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      error: "Erro na conexão com o banco de dados.",
      details: error.message || "Erro desconhecido",
      hint: "Verifique se a credencial do DATABASE_URL é válida e se o seu IP possui acesso permitido no painel do Neon."
    });
  }
});

app.post("/api/users", async (req, res) => {
  const { id, nome, email, senha, perfil, empresa, ativo, creatorEmail } = req.body;
  const finalId = id || "usr-" + Date.now();
  try {
    const hashedSenha = bcrypt.hashSync(senha, 10);
    let resultUser;

    if (useDatabase) {
      const inserted = await sql`
        INSERT INTO usuarios (id, nome, email, senha, perfil, empresa, ativo)
        VALUES (${finalId}, ${nome}, ${email}, ${hashedSenha}, ${perfil}, ${empresa}, ${ativo || 'Sim'})
        RETURNING id, nome, email, perfil, empresa, ativo
      `;
      resultUser = inserted[0];
    } else {
      const newUser = { id: finalId, nome, email, senha: hashedSenha, perfil, empresa, ativo: ativo || 'Sim' };
      localUsers.push(newUser);
      const { senha: _, ...safeUser } = newUser;
      resultUser = safeUser;
    }

    if (creatorEmail) {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] Criador: ${creatorEmail} | Novo Usuário: ${email}\n`;
      try {
        fs.appendFileSync(path.join(process.cwd(), 'history'), logLine, 'utf8');
      } catch (err) {
        console.error('Failed to write history log:', err);
      }
    }

    return res.json(resultUser);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create user" });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, perfil, empresa, ativo } = req.body;
  try {
    if (useDatabase) {
      let updated;
      if (senha && senha.trim() !== '') {
        const hashedSenha = bcrypt.hashSync(senha, 10);
        updated = await sql`
          UPDATE usuarios 
          SET nome = ${nome}, email = ${email}, senha = ${hashedSenha}, perfil = ${perfil}, empresa = ${empresa}, ativo = ${ativo}
          WHERE id = ${id}
          RETURNING id, nome, email, perfil, empresa, ativo
        `;
      } else {
        updated = await sql`
          UPDATE usuarios 
          SET nome = ${nome}, email = ${email}, perfil = ${perfil}, empresa = ${empresa}, ativo = ${ativo}
          WHERE id = ${id}
          RETURNING id, nome, email, perfil, empresa, ativo
        `;
      }
      if (updated.length === 0) return res.status(404).json({ error: "User not found" });
      return res.json(updated[0]);
    } else {
      const index = localUsers.findIndex(u => u.id === id);
      if (index === -1) return res.status(404).json({ error: "User not found" });
      
      const newSenha = (senha && senha.trim() !== '') ? bcrypt.hashSync(senha, 10) : localUsers[index].senha;
      localUsers[index] = { id, nome, email, senha: newSenha, perfil, empresa, ativo };
      
      const { senha: _, ...safeUser } = localUsers[index];
      return res.json(safeUser);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update user" });
  }
});

// Tickets Endpoints
app.get("/api/tickets", async (req, res) => {
  try {
    if (useDatabase) {
      const rows = await sql`SELECT * FROM atendimentos ORDER BY data_abertura DESC`;
      // Map Stringified JSON back
      const parsed = rows.map((r: any) => {
        try {
          r.anexos = r.anexos ? JSON.parse(r.anexos) : [];
        } catch (e) {
          r.anexos = [];
        }
        return r;
      });
      return res.json(parsed);
    }
    const parsedLocal = localTickets.map(t => {
      if (typeof t.anexos === "string") {
        try {
          t.anexos = JSON.parse(t.anexos);
        } catch (e) {
          t.anexos = [];
        }
      }
      return t;
    });
    return res.json(parsedLocal);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

app.post("/api/tickets", async (req, res) => {
  const { id, protocolo, assunto, categoria, descricao, solicitacao, empresa, status, data_abertura, data_necessaria, data_retorno, data_encerramento, solicitante_id, responsavel_id, parecer, anexos } = req.body;
  const strAnexos = typeof anexos === "string" ? anexos : JSON.stringify(anexos || []);
  
  try {
    if (useDatabase) {
      const inserted = await sql`
        INSERT INTO atendimentos (
          id, protocolo, assunto, categoria, descricao, solicitacao, empresa, 
          status, data_abertura, data_necessaria, data_retorno, data_encerramento, 
          solicitante_id, responsavel_id, parecer, anexos
        )
        VALUES (
          ${id}, ${protocolo}, ${assunto}, ${categoria}, ${descricao}, ${solicitacao}, ${empresa},
          ${status}, ${data_abertura}, ${data_necessaria || null}, ${data_retorno || null}, ${data_encerramento || null}, 
          ${solicitante_id}, ${responsavel_id || null}, ${parecer || null}, ${strAnexos}
        )
        RETURNING *
      `;
      const result = inserted[0];
      try {
        result.anexos = JSON.parse(result.anexos || "[]");
      } catch (e) {}
      return res.json(result);
    } else {
      const newTicket = { 
        id, protocolo, assunto, categoria, descricao, solicitacao, empresa, 
        status, data_abertura, data_necessaria, data_retorno, data_encerramento, 
        solicitante_id, responsavel_id, parecer, anexos: strAnexos 
      };
      localTickets.push(newTicket);
      return res.json({ ...newTicket, anexos: JSON.parse(strAnexos) });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create ticket" });
  }
});

app.put("/api/tickets/:id", async (req, res) => {
  const { id } = req.params;
  const { protocolo, assunto, categoria, descricao, solicitacao, empresa, status, data_abertura, data_necessaria, data_retorno, data_encerramento, solicitante_id, responsavel_id, parecer, anexos } = req.body;
  const strAnexos = typeof anexos === "string" ? anexos : JSON.stringify(anexos || []);
  
  try {
    if (useDatabase) {
      const updated = await sql`
        UPDATE atendimentos 
        SET protocolo = ${protocolo}, assunto = ${assunto}, categoria = ${categoria}, descricao = ${descricao}, 
            solicitacao = ${solicitacao}, empresa = ${empresa}, status = ${status}, data_abertura = ${data_abertura}, 
            data_necessaria = ${data_necessaria || null}, data_retorno = ${data_retorno || null}, data_encerramento = ${data_encerramento || null}, 
            solicitante_id = ${solicitante_id}, responsavel_id = ${responsavel_id || null}, parecer = ${parecer || null}, anexos = ${strAnexos}
        WHERE id = ${id}
        RETURNING *
      `;
      if (updated.length === 0) return res.status(404).json({ error: "Ticket not found" });
      const r = updated[0];
      try {
        r.anexos = JSON.parse(r.anexos || "[]");
      } catch (e) {}
      return res.json(r);
    } else {
      const index = localTickets.findIndex(t => t.id === id);
      if (index === -1) return res.status(404).json({ error: "Ticket not found" });
      localTickets[index] = { 
        id, protocolo, assunto, categoria, descricao, solicitacao, empresa, 
        status, data_abertura, data_necessaria, data_retorno, data_encerramento, 
        solicitante_id, responsavel_id, parecer, anexos: strAnexos 
      };
      return res.json({ ...localTickets[index], anexos: JSON.parse(strAnexos) });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update ticket" });
  }
});

// History Endpoints
app.get("/api/history", async (req, res) => {
  try {
    if (useDatabase) {
      const rows = await sql`SELECT * FROM historico_atendimentos ORDER BY data_hora DESC`;
      return res.json(rows);
    }
    return res.json(localHistory);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.post("/api/history", async (req, res) => {
  const { id, atendimento_id, usuario_id, data_hora, acao, observacao } = req.body;
  try {
    if (useDatabase) {
      const inserted = await sql`
        INSERT INTO historico_atendimentos (id, atendimento_id, usuario_id, data_hora, acao, observacao)
        VALUES (${id}, ${atendimento_id}, ${usuario_id}, ${data_hora}, ${acao}, ${observacao})
        RETURNING *
      `;
      return res.json(inserted[0]);
    } else {
      const newRec = { id, atendimento_id, usuario_id, data_hora, acao, observacao };
      localHistory.push(newRec);
      return res.json(newRec);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to insert history" });
  }
});

// Notifications Endpoints
app.get("/api/notifications", async (req, res) => {
  try {
    if (useDatabase) {
      const rows = await sql`SELECT * FROM notificacoes ORDER BY data_hora DESC`;
      return res.json(rows);
    }
    return res.json(localNotifications);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.post("/api/notifications", async (req, res) => {
  const { id, usuario_id, perfil_alvo, titulo, mensagem, data_hora, protocolo, lida, tipo } = req.body;
  try {
    if (useDatabase) {
      const inserted = await sql`
        INSERT INTO notificacoes (id, usuario_id, perfil_alvo, titulo, mensagem, data_hora, protocolo, lida, tipo)
        VALUES (${id}, ${usuario_id || null}, ${perfil_alvo || null}, ${titulo}, ${mensagem}, ${data_hora}, ${protocolo || null}, ${lida || false}, ${tipo})
        RETURNING *
      `;
      return res.json(inserted[0]);
    } else {
      const newNotif = { id, usuario_id, perfil_alvo, titulo, mensagem, data_hora, protocolo, lida: lida || false, tipo };
      localNotifications.unshift(newNotif);
      return res.json(newNotif);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to trigger notification" });
  }
});

app.put("/api/notifications/:id/read", async (req, res) => {
  const { id } = req.params;
  try {
    if (useDatabase) {
      await sql`UPDATE notificacoes SET lida = TRUE WHERE id = ${id}`;
      return res.json({ success: true });
    } else {
      const index = localNotifications.findIndex(n => n.id === id);
      if (index !== -1) {
        localNotifications[index].lida = true;
      }
      return res.json({ success: true });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications/mark-all-read", async (req, res) => {
  const { userId, perfil } = req.body;
  try {
    if (useDatabase) {
      await sql`
        UPDATE notificacoes 
        SET lida = TRUE 
        WHERE usuario_id = ${userId} 
           OR perfil_alvo = ${perfil} 
           OR perfil_alvo = 'Todos'
           OR (${perfil} = 'Administrador' AND perfil_alvo = 'Atendente')
           OR (${perfil} = 'Atendente' AND perfil_alvo = 'Administrador')
      `;
      return res.json({ success: true });
    } else {
      localNotifications = localNotifications.map(n => {
        const isUserRecipient = n.usuario_id === userId;
        const isProfileRecipient = n.perfil_alvo === perfil || n.perfil_alvo === 'Todos' || (perfil === 'Administrador' && n.perfil_alvo === 'Atendente') || (perfil === 'Atendente' && n.perfil_alvo === 'Administrador');
        if (isUserRecipient || isProfileRecipient) {
          return { ...n, lida: true };
        }
        return n;
      });
      return res.json({ success: true });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/notifications/clear", async (req, res) => {
  const { userId, perfil } = req.body;
  try {
    if (useDatabase) {
      await sql`
        DELETE FROM notificacoes 
        WHERE usuario_id = ${userId} 
           OR perfil_alvo = ${perfil} 
           OR perfil_alvo = 'Todos'
      `;
      return res.json({ success: true });
    } else {
      localNotifications = localNotifications.filter(n => {
        const isUserRecipient = n.usuario_id === userId;
        const isProfileRecipient = n.perfil_alvo === perfil || n.perfil_alvo === 'Todos';
        return !isUserRecipient && !isProfileRecipient;
      });
      return res.json({ success: true });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Database Management Endpoints


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", usingNeon: useDatabase });
});

// ----------------------
// BUILD INTEGRATIONS & SERVER ASSETS
// ----------------------

async function startServer() {
  // Setup tables & seeds before launching
  await initializeDbSchema();

  // Vite integration middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static asset serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
