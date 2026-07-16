import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';

// Type definitions
export interface TeamMember {
  id: number;
  name: string;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  created_at: string;
}

export interface Submission {
  id: number;
  team_member_id: number;
  blocked_by_text: string | null;
  created_at: string;
}

export interface SubmissionWithDetails extends Submission {
  team_member_name: string;
  projects: Project[];
  talk_to: TeamMember[];
}

// Detect which database to use
const useMySQL = !!process.env.MYSQL_HOST;

// SQLite setup
let sqliteDb: Database.Database | null = null;

function getSqliteDb(): Database.Database {
  if (!sqliteDb) {
    const dbPath = path.join(process.cwd(), 'dashup.db');
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('foreign_keys = ON');
    
    // Initialize schema
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_member_id INTEGER NOT NULL,
        blocked_by_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS submission_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(submission_id, project_id)
      );

      CREATE TABLE IF NOT EXISTS submission_talk_to (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER NOT NULL,
        team_member_id INTEGER NOT NULL,
        priority TEXT NOT NULL DEFAULT 'green',
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
        UNIQUE(submission_id, team_member_id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Initialize default settings
    try {
      sqliteDb.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('logo_url', '');
      sqliteDb.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('landing_image_url', '');
    } catch {
      // Settings already exist
    }
  }
  return sqliteDb;
}

// MySQL setup
let mysqlPool: mysql.Pool | null = null;

function getMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return mysqlPool;
}

// Initialize MySQL schema
async function initMysqlSchema(): Promise<void> {
  const pool = getMysqlPool();
  
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_member_id INT NOT NULL,
      blocked_by_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS submission_projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      submission_id INT NOT NULL,
      project_id INT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE KEY unique_submission_project (submission_id, project_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS submission_talk_to (
      id INT AUTO_INCREMENT PRIMARY KEY,
      submission_id INT NOT NULL,
      team_member_id INT NOT NULL,
      priority VARCHAR(10) NOT NULL DEFAULT 'green',
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
      UNIQUE KEY unique_submission_member (submission_id, team_member_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Initialize default settings
  await pool.execute(`
    INSERT IGNORE INTO settings (\`key\`, value) VALUES ('logo_url', '')
  `);
  await pool.execute(`
    INSERT IGNORE INTO settings (\`key\`, value) VALUES ('landing_image_url', '')
  `);
}

// Initialize on first use
let mysqlInitialized = false;

async function ensureMysqlInit(): Promise<void> {
  if (!mysqlInitialized && useMySQL) {
    await initMysqlSchema();
    mysqlInitialized = true;
  }
}

// Database operations - Team Members
export const teamMemberOps = {
  getAll: async (): Promise<TeamMember[]> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute('SELECT * FROM team_members ORDER BY name');
      return rows as TeamMember[];
    } else {
      return getSqliteDb().prepare('SELECT * FROM team_members ORDER BY name').all() as TeamMember[];
    }
  },

  getById: async (id: number): Promise<TeamMember | undefined> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute('SELECT * FROM team_members WHERE id = ?', [id]);
      return (rows as TeamMember[])[0];
    } else {
      return getSqliteDb().prepare('SELECT * FROM team_members WHERE id = ?').get(id) as TeamMember | undefined;
    }
  },

  create: async (name: string): Promise<{ id: number; name: string; created_at: string }> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const [result] = await getMysqlPool().execute('INSERT INTO team_members (name) VALUES (?)', [name]);
      const insertResult = result as mysql.ResultSetHeader;
      return { id: insertResult.insertId, name, created_at: new Date().toISOString() };
    } else {
      const stmt = getSqliteDb().prepare('INSERT INTO team_members (name) VALUES (?)');
      const result = stmt.run(name);
      return { id: result.lastInsertRowid as number, name, created_at: new Date().toISOString() };
    }
  },

  update: async (id: number, name: string): Promise<{ id: number; name: string }> => {
    if (useMySQL) {
      await ensureMysqlInit();
      await getMysqlPool().execute('UPDATE team_members SET name = ? WHERE id = ?', [name, id]);
    } else {
      getSqliteDb().prepare('UPDATE team_members SET name = ? WHERE id = ?').run(name, id);
    }
    return { id, name };
  },

  delete: async (id: number): Promise<void> => {
    if (useMySQL) {
      await ensureMysqlInit();
      await getMysqlPool().execute('DELETE FROM team_members WHERE id = ?', [id]);
    } else {
      getSqliteDb().prepare('DELETE FROM team_members WHERE id = ?').run(id);
    }
  }
};

// Database operations - Projects
export const projectOps = {
  getAll: async (): Promise<Project[]> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute('SELECT * FROM projects ORDER BY name');
      return rows as Project[];
    } else {
      return getSqliteDb().prepare('SELECT * FROM projects ORDER BY name').all() as Project[];
    }
  },

  getById: async (id: number): Promise<Project | undefined> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute('SELECT * FROM projects WHERE id = ?', [id]);
      return (rows as Project[])[0];
    } else {
      return getSqliteDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
    }
  },

  create: async (name: string): Promise<{ id: number; name: string; created_at: string }> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const [result] = await getMysqlPool().execute('INSERT INTO projects (name) VALUES (?)', [name]);
      const insertResult = result as mysql.ResultSetHeader;
      return { id: insertResult.insertId, name, created_at: new Date().toISOString() };
    } else {
      const stmt = getSqliteDb().prepare('INSERT INTO projects (name) VALUES (?)');
      const result = stmt.run(name);
      return { id: result.lastInsertRowid as number, name, created_at: new Date().toISOString() };
    }
  },

  update: async (id: number, name: string): Promise<{ id: number; name: string }> => {
    if (useMySQL) {
      await ensureMysqlInit();
      await getMysqlPool().execute('UPDATE projects SET name = ? WHERE id = ?', [name, id]);
    } else {
      getSqliteDb().prepare('UPDATE projects SET name = ? WHERE id = ?').run(name, id);
    }
    return { id, name };
  },

  delete: async (id: number): Promise<void> => {
    if (useMySQL) {
      await ensureMysqlInit();
      await getMysqlPool().execute('DELETE FROM projects WHERE id = ?', [id]);
    } else {
      getSqliteDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
    }
  }
};

// Database operations - Submissions
export const submissionOps = {
  create: async (
    teamMemberId: number,
    blockedByText: string | null,
    projectIds: number[],
    talkToRequests: { memberId: number; priority: string }[]
  ): Promise<number> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const pool = getMysqlPool();
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        const [result] = await connection.execute(
          'INSERT INTO submissions (team_member_id, blocked_by_text) VALUES (?, ?)',
          [teamMemberId, blockedByText || null]
        );
        const submissionId = (result as mysql.ResultSetHeader).insertId;

        for (const projectId of projectIds) {
          await connection.execute(
            'INSERT INTO submission_projects (submission_id, project_id) VALUES (?, ?)',
            [submissionId, projectId]
          );
        }

        for (const talkTo of talkToRequests) {
          await connection.execute(
            'INSERT INTO submission_talk_to (submission_id, team_member_id, priority) VALUES (?, ?, ?)',
            [submissionId, talkTo.memberId, talkTo.priority]
          );
        }

        await connection.commit();
        return submissionId;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      const db = getSqliteDb();
      const insertSubmission = db.prepare(
        'INSERT INTO submissions (team_member_id, blocked_by_text) VALUES (?, ?)'
      );
      const insertProject = db.prepare(
        'INSERT INTO submission_projects (submission_id, project_id) VALUES (?, ?)'
      );
      const insertTalkTo = db.prepare(
        'INSERT INTO submission_talk_to (submission_id, team_member_id, priority) VALUES (?, ?, ?)'
      );

      const transaction = db.transaction(() => {
        const result = insertSubmission.run(teamMemberId, blockedByText || null);
        const submissionId = result.lastInsertRowid as number;

        for (const projectId of projectIds) {
          insertProject.run(submissionId, projectId);
        }

        for (const talkTo of talkToRequests) {
          insertTalkTo.run(submissionId, talkTo.memberId, talkTo.priority);
        }

        return submissionId;
      });

      return transaction();
    }
  },

  getTodaySubmissions: async (): Promise<SubmissionWithDetails[]> => {
    const today = new Date().toISOString().split('T')[0];

    if (useMySQL) {
      await ensureMysqlInit();
      const pool = getMysqlPool();
      
      const [submissions] = await pool.execute(`
        SELECT s.*, tm.name as team_member_name
        FROM submissions s
        JOIN team_members tm ON s.team_member_id = tm.id
        WHERE DATE(s.created_at) = ?
        ORDER BY s.created_at DESC
      `, [today]);

      const result: SubmissionWithDetails[] = [];
      for (const sub of submissions as (Submission & { team_member_name: string })[]) {
        const [projects] = await pool.execute(`
          SELECT p.* FROM projects p
          JOIN submission_projects sp ON p.id = sp.project_id
          WHERE sp.submission_id = ?
        `, [sub.id]);

        const [talkTo] = await pool.execute(`
          SELECT tm.* FROM team_members tm
          JOIN submission_talk_to st ON tm.id = st.team_member_id
          WHERE st.submission_id = ?
        `, [sub.id]);

        result.push({
          ...sub,
          projects: projects as Project[],
          talk_to: talkTo as TeamMember[]
        });
      }
      return result;
    } else {
      const db = getSqliteDb();
      const submissions = db.prepare(`
        SELECT s.*, tm.name as team_member_name
        FROM submissions s
        JOIN team_members tm ON s.team_member_id = tm.id
        WHERE date(s.created_at) = date(?)
        ORDER BY s.created_at DESC
      `).all(today) as (Submission & { team_member_name: string })[];

      const getProjects = db.prepare(`
        SELECT p.* FROM projects p
        JOIN submission_projects sp ON p.id = sp.project_id
        WHERE sp.submission_id = ?
      `);

      const getTalkTo = db.prepare(`
        SELECT tm.* FROM team_members tm
        JOIN submission_talk_to st ON tm.id = st.team_member_id
        WHERE st.submission_id = ?
      `);

      return submissions.map(sub => ({
        ...sub,
        projects: getProjects.all(sub.id) as Project[],
        talk_to: getTalkTo.all(sub.id) as TeamMember[]
      }));
    }
  },

  getTodaySubmissionForMember: async (teamMemberId: number) => {
    const today = new Date().toISOString().split('T')[0];

    if (useMySQL) {
      await ensureMysqlInit();
      const pool = getMysqlPool();

      const [submissions] = await pool.execute(`
        SELECT s.*, tm.name as team_member_name
        FROM submissions s
        JOIN team_members tm ON s.team_member_id = tm.id
        WHERE s.team_member_id = ? AND DATE(s.created_at) = ?
        ORDER BY s.created_at DESC
        LIMIT 1
      `, [teamMemberId, today]);

      const submissionRows = submissions as (Submission & { team_member_name: string })[];
      if (submissionRows.length === 0) return null;

      const submission = submissionRows[0];

      const [projects] = await pool.execute(`
        SELECT p.id, p.name FROM projects p
        JOIN submission_projects sp ON p.id = sp.project_id
        WHERE sp.submission_id = ?
      `, [submission.id]);

      const [talkTo] = await pool.execute(`
        SELECT tm.id, tm.name, st.priority
        FROM team_members tm
        JOIN submission_talk_to st ON tm.id = st.team_member_id
        WHERE st.submission_id = ?
      `, [submission.id]);

      return {
        ...submission,
        projects: projects as { id: number; name: string }[],
        talkTo: talkTo as { id: number; name: string; priority: string }[]
      };
    } else {
      const db = getSqliteDb();
      const submission = db.prepare(`
        SELECT s.*, tm.name as team_member_name
        FROM submissions s
        JOIN team_members tm ON s.team_member_id = tm.id
        WHERE s.team_member_id = ? AND date(s.created_at) = date(?)
        ORDER BY s.created_at DESC
        LIMIT 1
      `).get(teamMemberId, today) as (Submission & { team_member_name: string }) | undefined;

      if (!submission) return null;

      const projects = db.prepare(`
        SELECT p.id, p.name FROM projects p
        JOIN submission_projects sp ON p.id = sp.project_id
        WHERE sp.submission_id = ?
      `).all(submission.id) as { id: number; name: string }[];

      const talkTo = db.prepare(`
        SELECT tm.id, tm.name, st.priority
        FROM team_members tm
        JOIN submission_talk_to st ON tm.id = st.team_member_id
        WHERE st.submission_id = ?
      `).all(submission.id) as { id: number; name: string; priority: string }[];

      return {
        ...submission,
        projects,
        talkTo
      };
    }
  },

  updateSubmission: async (
    submissionId: number,
    blockedByText: string | null,
    projectIds: number[],
    talkToRequests: { memberId: number; priority: string }[]
  ): Promise<number> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const pool = getMysqlPool();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        await connection.execute(
          'UPDATE submissions SET blocked_by_text = ? WHERE id = ?',
          [blockedByText || null, submissionId]
        );
        await connection.execute('DELETE FROM submission_projects WHERE submission_id = ?', [submissionId]);
        await connection.execute('DELETE FROM submission_talk_to WHERE submission_id = ?', [submissionId]);

        for (const projectId of projectIds) {
          await connection.execute(
            'INSERT INTO submission_projects (submission_id, project_id) VALUES (?, ?)',
            [submissionId, projectId]
          );
        }

        for (const talkTo of talkToRequests) {
          await connection.execute(
            'INSERT INTO submission_talk_to (submission_id, team_member_id, priority) VALUES (?, ?, ?)',
            [submissionId, talkTo.memberId, talkTo.priority]
          );
        }

        await connection.commit();
        return submissionId;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      const db = getSqliteDb();
      const updateSubmission = db.prepare('UPDATE submissions SET blocked_by_text = ? WHERE id = ?');
      const deleteProjects = db.prepare('DELETE FROM submission_projects WHERE submission_id = ?');
      const deleteTalkTo = db.prepare('DELETE FROM submission_talk_to WHERE submission_id = ?');
      const insertProject = db.prepare('INSERT INTO submission_projects (submission_id, project_id) VALUES (?, ?)');
      const insertTalkTo = db.prepare('INSERT INTO submission_talk_to (submission_id, team_member_id, priority) VALUES (?, ?, ?)');

      const transaction = db.transaction(() => {
        updateSubmission.run(blockedByText || null, submissionId);
        deleteProjects.run(submissionId);
        deleteTalkTo.run(submissionId);

        for (const projectId of projectIds) {
          insertProject.run(submissionId, projectId);
        }

        for (const talkTo of talkToRequests) {
          insertTalkTo.run(submissionId, talkTo.memberId, talkTo.priority);
        }

        return submissionId;
      });

      return transaction();
    }
  },

  getProjectCounts: async () => {
    const today = new Date().toISOString().split('T')[0];

    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute(`
        SELECT 
          p.id, 
          p.name, 
          COUNT(sp.id) as count,
          COALESCE(GROUP_CONCAT(DISTINCT tm.name SEPARATOR ', '), '') as member_names
        FROM projects p
        LEFT JOIN submission_projects sp ON p.id = sp.project_id
        LEFT JOIN submissions s ON sp.submission_id = s.id AND DATE(s.created_at) = ?
        LEFT JOIN team_members tm ON s.team_member_id = tm.id
        GROUP BY p.id, p.name
        ORDER BY count DESC
      `, [today]);
      return rows as { id: number; name: string; count: number; member_names: string }[];
    } else {
      return getSqliteDb().prepare(`
        SELECT 
          p.id, 
          p.name, 
          COUNT(sp.id) as count,
          COALESCE(GROUP_CONCAT(DISTINCT tm.name), '') as member_names
        FROM projects p
        LEFT JOIN submission_projects sp ON p.id = sp.project_id
        LEFT JOIN submissions s ON sp.submission_id = s.id AND date(s.created_at) = date(?)
        LEFT JOIN team_members tm ON s.team_member_id = tm.id
        GROUP BY p.id, p.name
        ORDER BY count DESC
      `).all(today) as { id: number; name: string; count: number; member_names: string }[];
    }
  },

  getMembersPerProject: async () => {
    const today = new Date().toISOString().split('T')[0];

    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute(`
        SELECT 
          p.id, 
          p.name, 
          COUNT(DISTINCT s.team_member_id) as member_count,
          COALESCE(GROUP_CONCAT(DISTINCT tm.name SEPARATOR ', '), '') as member_names
        FROM projects p
        LEFT JOIN submission_projects sp ON p.id = sp.project_id
        LEFT JOIN submissions s ON sp.submission_id = s.id AND DATE(s.created_at) = ?
        LEFT JOIN team_members tm ON s.team_member_id = tm.id
        GROUP BY p.id, p.name
        ORDER BY member_count DESC
      `, [today]);
      return rows as { id: number; name: string; member_count: number; member_names: string }[];
    } else {
      return getSqliteDb().prepare(`
        SELECT 
          p.id, 
          p.name, 
          COUNT(DISTINCT s.team_member_id) as member_count,
          COALESCE(GROUP_CONCAT(DISTINCT tm.name), '') as member_names
        FROM projects p
        LEFT JOIN submission_projects sp ON p.id = sp.project_id
        LEFT JOIN submissions s ON sp.submission_id = s.id AND date(s.created_at) = date(?)
        LEFT JOIN team_members tm ON s.team_member_id = tm.id
        GROUP BY p.id, p.name
        ORDER BY member_count DESC
      `).all(today) as { id: number; name: string; member_count: number; member_names: string }[];
    }
  },

  getContextSwitchMinutes: async () => {
    const today = new Date().toISOString().split('T')[0];

    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute(`
        SELECT SUM(
          CASE 
            WHEN project_count > 1 THEN (project_count - 1) * 23
            ELSE 0
          END
        ) as total_minutes
        FROM (
          SELECT s.id, COUNT(sp.project_id) as project_count
          FROM submissions s
          LEFT JOIN submission_projects sp ON s.id = sp.submission_id
          WHERE DATE(s.created_at) = ?
          GROUP BY s.id
        ) as counts
      `, [today]);
      const result = (rows as { total_minutes: number | null }[])[0];
      return result?.total_minutes || 0;
    } else {
      const result = getSqliteDb().prepare(`
        SELECT SUM(
          CASE 
            WHEN project_count > 1 THEN (project_count - 1) * 23
            ELSE 0
          END
        ) as total_minutes
        FROM (
          SELECT s.id, COUNT(sp.project_id) as project_count
          FROM submissions s
          LEFT JOIN submission_projects sp ON s.id = sp.submission_id
          WHERE date(s.created_at) = date(?)
          GROUP BY s.id
        )
      `).get(today) as { total_minutes: number | null };
      return result.total_minutes || 0;
    }
  },

  getTalkToList: async () => {
    const today = new Date().toISOString().split('T')[0];

    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute(`
        SELECT 
          tm_from.name as from_name,
          tm_to.name as to_name,
          st.priority
        FROM submission_talk_to st
        JOIN submissions s ON st.submission_id = s.id
        JOIN team_members tm_from ON s.team_member_id = tm_from.id
        JOIN team_members tm_to ON st.team_member_id = tm_to.id
        WHERE DATE(s.created_at) = ?
        ORDER BY 
          CASE st.priority 
            WHEN 'red' THEN 1 
            WHEN 'amber' THEN 2 
            WHEN 'green' THEN 3 
          END,
          tm_from.name, 
          tm_to.name
      `, [today]);
      return rows as { from_name: string; to_name: string; priority: string }[];
    } else {
      return getSqliteDb().prepare(`
        SELECT 
          tm_from.name as from_name,
          tm_to.name as to_name,
          st.priority
        FROM submission_talk_to st
        JOIN submissions s ON st.submission_id = s.id
        JOIN team_members tm_from ON s.team_member_id = tm_from.id
        JOIN team_members tm_to ON st.team_member_id = tm_to.id
        WHERE date(s.created_at) = date(?)
        ORDER BY 
          CASE st.priority 
            WHEN 'red' THEN 1 
            WHEN 'amber' THEN 2 
            WHEN 'green' THEN 3 
          END,
          tm_from.name, 
          tm_to.name
      `).all(today) as { from_name: string; to_name: string; priority: string }[];
    }
  },

  getBlockers: async () => {
    const today = new Date().toISOString().split('T')[0];

    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute(`
        SELECT tm.name as team_member_name, s.blocked_by_text
        FROM submissions s
        JOIN team_members tm ON s.team_member_id = tm.id
        WHERE DATE(s.created_at) = ?
          AND s.blocked_by_text IS NOT NULL
          AND s.blocked_by_text != ''
        ORDER BY s.created_at DESC
      `, [today]);
      return rows as { team_member_name: string; blocked_by_text: string }[];
    } else {
      return getSqliteDb().prepare(`
        SELECT tm.name as team_member_name, s.blocked_by_text
        FROM submissions s
        JOIN team_members tm ON s.team_member_id = tm.id
        WHERE date(s.created_at) = date(?)
          AND s.blocked_by_text IS NOT NULL
          AND s.blocked_by_text != ''
        ORDER BY s.created_at DESC
      `).all(today) as { team_member_name: string; blocked_by_text: string }[];
    }
  },

  getCollaborationOpportunities: async () => {
    const today = new Date().toISOString().split('T')[0];

    if (useMySQL) {
      await ensureMysqlInit();
      const pool = getMysqlPool();

      const [overlaps] = await pool.execute(`
        WITH member_projects AS (
          SELECT DISTINCT 
            tm.id as member_id,
            tm.name as member_name,
            p.id as project_id,
            p.name as project_name
          FROM submissions s
          JOIN team_members tm ON s.team_member_id = tm.id
          JOIN submission_projects sp ON s.id = sp.submission_id
          JOIN projects p ON sp.project_id = p.id
          WHERE DATE(s.created_at) = ?
        ),
        member_overlap_pairs AS (
          SELECT 
            mp1.member_id as member1_id,
            mp1.member_name as member1_name,
            mp2.member_id as member2_id,
            mp2.member_name as member2_name,
            mp1.project_id,
            mp1.project_name
          FROM member_projects mp1
          JOIN member_projects mp2 ON mp1.project_id = mp2.project_id
          WHERE mp1.member_id < mp2.member_id
        )
        SELECT 
          member1_name,
          member2_name,
          GROUP_CONCAT(project_name SEPARATOR ', ') as shared_projects,
          COUNT(*) as shared_count
        FROM member_overlap_pairs
        GROUP BY member1_id, member2_id
        HAVING shared_count >= 2
        ORDER BY shared_count DESC
      `, [today]);

      const [memberProjectCounts] = await pool.execute(`
        SELECT 
          tm.name as member_name,
          COUNT(DISTINCT sp.project_id) as project_count
        FROM submissions s
        JOIN team_members tm ON s.team_member_id = tm.id
        JOIN submission_projects sp ON s.id = sp.submission_id
        WHERE DATE(s.created_at) = ?
        GROUP BY tm.id
        HAVING project_count >= 2
        ORDER BY project_count DESC
      `, [today]);

      return {
        overlaps: overlaps as { member1_name: string; member2_name: string; shared_projects: string; shared_count: number }[],
        memberProjectCounts: memberProjectCounts as { member_name: string; project_count: number }[]
      };
    } else {
      const db = getSqliteDb();

      const overlaps = db.prepare(`
        WITH member_projects AS (
          SELECT DISTINCT 
            tm.id as member_id,
            tm.name as member_name,
            p.id as project_id,
            p.name as project_name
          FROM submissions s
          JOIN team_members tm ON s.team_member_id = tm.id
          JOIN submission_projects sp ON s.id = sp.submission_id
          JOIN projects p ON sp.project_id = p.id
          WHERE date(s.created_at) = date(?)
        ),
        member_overlap_pairs AS (
          SELECT 
            mp1.member_id as member1_id,
            mp1.member_name as member1_name,
            mp2.member_id as member2_id,
            mp2.member_name as member2_name,
            mp1.project_id,
            mp1.project_name
          FROM member_projects mp1
          JOIN member_projects mp2 ON mp1.project_id = mp2.project_id
          WHERE mp1.member_id < mp2.member_id
        )
        SELECT 
          member1_name,
          member2_name,
          GROUP_CONCAT(project_name, ', ') as shared_projects,
          COUNT(*) as shared_count
        FROM member_overlap_pairs
        GROUP BY member1_id, member2_id
        HAVING shared_count >= 2
        ORDER BY shared_count DESC
      `).all(today) as { member1_name: string; member2_name: string; shared_projects: string; shared_count: number }[];

      const memberProjectCounts = db.prepare(`
        SELECT 
          tm.name as member_name,
          COUNT(DISTINCT sp.project_id) as project_count
        FROM submissions s
        JOIN team_members tm ON s.team_member_id = tm.id
        JOIN submission_projects sp ON s.id = sp.submission_id
        WHERE date(s.created_at) = date(?)
        GROUP BY tm.id
        HAVING project_count >= 2
        ORDER BY project_count DESC
      `).all(today) as { member_name: string; project_count: number }[];

      return { overlaps, memberProjectCounts };
    }
  }
};

// Database operations - Settings
export const settingsOps = {
  get: async (key: string): Promise<string | null> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute('SELECT value FROM settings WHERE `key` = ?', [key]);
      const result = (rows as { value: string }[])[0];
      return result?.value ?? null;
    } else {
      const result = getSqliteDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      return result?.value ?? null;
    }
  },

  getAll: async (): Promise<{ logo_url: string; landing_image_url: string }> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const [rows] = await getMysqlPool().execute('SELECT `key`, value FROM settings');
      const settings = rows as { key: string; value: string }[];
      const result: { logo_url: string; landing_image_url: string } = {
        logo_url: '',
        landing_image_url: ''
      };
      for (const s of settings) {
        if (s.key === 'logo_url' || s.key === 'landing_image_url') {
          result[s.key] = s.value;
        }
      }
      return result;
    } else {
      const settings = getSqliteDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
      const result: { logo_url: string; landing_image_url: string } = {
        logo_url: '',
        landing_image_url: ''
      };
      for (const s of settings) {
        if (s.key === 'logo_url' || s.key === 'landing_image_url') {
          result[s.key] = s.value;
        }
      }
      return result;
    }
  },

  set: async (key: string, value: string): Promise<void> => {
    if (useMySQL) {
      await ensureMysqlInit();
      await getMysqlPool().execute(
        'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        [key, value, value]
      );
    } else {
      getSqliteDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  },

  update: async (settings: { logo_url?: string; landing_image_url?: string }): Promise<void> => {
    if (useMySQL) {
      await ensureMysqlInit();
      const pool = getMysqlPool();
      if (settings.logo_url !== undefined) {
        await pool.execute(
          'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
          ['logo_url', settings.logo_url, settings.logo_url]
        );
      }
      if (settings.landing_image_url !== undefined) {
        await pool.execute(
          'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
          ['landing_image_url', settings.landing_image_url, settings.landing_image_url]
        );
      }
    } else {
      const db = getSqliteDb();
      const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const transaction = db.transaction(() => {
        if (settings.logo_url !== undefined) {
          updateStmt.run('logo_url', settings.logo_url);
        }
        if (settings.landing_image_url !== undefined) {
          updateStmt.run('landing_image_url', settings.landing_image_url);
        }
      });
      transaction();
    }
  }
};

// Export for backward compatibility
export default { useMySQL };
