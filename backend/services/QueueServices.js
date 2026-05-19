const { v4: uuidv4 } = require('uuid');

class QueueService {
  constructor(db) { this.db = db; }

  enqueue(type, referenceId, priority = 1) {
    const id = uuidv4();
    this.db.prepare(`INSERT INTO queue_entries (id,type,reference_id,priority,status) VALUES (?,?,?,?,'waiting')`).run(id, type, referenceId, priority);
    return id;
  }

  dequeue(type) {
    return this.db.prepare(`SELECT * FROM queue_entries WHERE type=? AND status='waiting' ORDER BY priority DESC, created_at ASC LIMIT 1`).get(type);
  }

  getQueue(type, status = 'waiting') {
    return this.db.prepare(`SELECT * FROM queue_entries WHERE type=? AND status=? ORDER BY priority DESC, created_at ASC`).all(type, status);
  }

  updateStatus(id, status) {
    this.db.prepare(`UPDATE queue_entries SET status=? WHERE id=?`).run(status, id);
  }

  processNext(type) {
    const next = this.dequeue(type);
    if (next) this.updateStatus(next.id, 'processing');
    return next;
  }

  complete(id)       { this.updateStatus(id, 'completed'); }
  cancel(id)         { this.updateStatus(id, 'cancelled'); }
  setPriority(id, p) { this.db.prepare(`UPDATE queue_entries SET priority=? WHERE id=?`).run(p, id); }

  getStats() {
    return this.db.prepare(`SELECT type, status, COUNT(*) as count FROM queue_entries GROUP BY type, status`).all();
  }
}

module.exports = QueueService;