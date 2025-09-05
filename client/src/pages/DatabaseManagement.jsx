import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { Database, HddStack, CloudDownload, Activity } from 'react-bootstrap-icons';
import api from '../api/axios';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';

const DatabaseManagement = () => {
  const [dbStatus, setDbStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  const fetchDbStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/db-status');
      setDbStatus(response.data);
    } catch (error) {
      showToast('Failed to fetch database status', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await api.get('/api/backups');
      setBackups(response.data.backups || []);
    } catch (error) {
      showToast('Failed to fetch backups', 'danger');
    }
  };

  const createBackup = async () => {
    try {
      setBackupLoading(true);
      const response = await api.post('/api/backup');
      if (response.data.success) {
        showToast(`Backup created: ${response.data.filename}`, 'success');
        fetchBackups();
      } else {
        showToast('Backup failed: ' + response.data.error, 'danger');
      }
    } catch (error) {
      showToast('Failed to create backup', 'danger');
    } finally {
      setBackupLoading(false);
    }
  };

  const runMigration = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/migrate-timestamps');
      if (response.data.success) {
        showToast('Database migration completed successfully', 'success');
        fetchDbStatus();
      } else {
        showToast('Migration failed: ' + response.data.error, 'danger');
      }
    } catch (error) {
      showToast('Failed to run migration', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchBackups();
    
    const interval = setInterval(fetchDbStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPoolHealthColor = (pool) => {
    if (!pool) return 'secondary';
    const utilization = (pool.totalCount - pool.idleCount) / pool.totalCount;
    if (utilization > 0.8) return 'danger';
    if (utilization > 0.6) return 'warning';
    return 'success';
  };

  return (
    <Container fluid className="p-4">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <Row className="mb-4">
        <Col>
          <h2><Database className="me-2" />Database Management</h2>
          <p className="text-muted">Monitor database performance, connection pools, cache, and backups</p>
        </Col>
      </Row>

      {/* Database Status */}
      <Row className="mb-4">
        <Col lg={4} className="mb-3">
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <Activity className="me-2" />
              Connection Pool
            </Card.Header>
            <Card.Body>
              {dbStatus?.pool ? (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Active Connections</span>
                    <Badge bg={getPoolHealthColor(dbStatus.pool)}>
                      {dbStatus.pool.totalCount - dbStatus.pool.idleCount}/{dbStatus.pool.totalCount}
                    </Badge>
                  </div>
                  <ProgressBar 
                    now={((dbStatus.pool.totalCount - dbStatus.pool.idleCount) / dbStatus.pool.totalCount) * 100}
                    variant={getPoolHealthColor(dbStatus.pool)}
                    className="mb-2"
                  />
                  <small className="text-muted">
                    Idle: {dbStatus.pool.idleCount} | Waiting: {dbStatus.pool.waitingCount}
                  </small>
                </>
              ) : (
                <div className="text-center">
                  <div className="spinner-border spinner-border-sm" />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mb-3">
          <Card className="h-100">
            <Card.Header className="bg-info text-white">
              <HddStack className="me-2" />
              Cache Status
            </Card.Header>
            <Card.Body>
              {dbStatus?.cache ? (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Status</span>
                    <Badge bg={dbStatus.cache.connected ? 'success' : 'secondary'}>
                      {dbStatus.cache.connected ? 'Connected' : 'Disabled'}
                    </Badge>
                  </div>
                  {dbStatus.cache.connected && (
                    <>
                      <div className="d-flex justify-content-between mb-1">
                        <span>Keys</span>
                        <span>{dbStatus.cache.keyCount}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Memory</span>
                        <span>{dbStatus.cache.memory}</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <div className="spinner-border spinner-border-sm" />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mb-3">
          <Card className="h-100">
            <Card.Header className="bg-success text-white">
              <CloudDownload className="me-2" />
              Backup Status
            </Card.Header>
            <Card.Body>
              {dbStatus?.backup ? (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Total Backups</span>
                    <Badge bg="success">{dbStatus.backup.count}</Badge>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Total Size</span>
                    <span>{dbStatus.backup.totalSize}</span>
                  </div>
                  <div className="d-grid gap-2">
                    <Button 
                      variant="outline-success" 
                      size="sm"
                      onClick={createBackup}
                      disabled={backupLoading}
                    >
                      {backupLoading ? 'Creating...' : 'Create Backup'}
                    </Button>
                    <Button 
                      variant="outline-warning" 
                      size="sm"
                      onClick={runMigration}
                      disabled={loading}
                    >
                      {loading ? 'Migrating...' : 'Fix Timestamps'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="spinner-border spinner-border-sm" />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Backup History */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <strong>Backup History</strong>
              <Button 
                variant="outline-primary" 
                size="sm" 
                className="float-end"
                onClick={fetchBackups}
              >
                Refresh
              </Button>
            </Card.Header>
            <Card.Body>
              {backups.length > 0 ? (
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Size</th>
                      <th>Created</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup, index) => (
                      <tr key={index}>
                        <td className="font-monospace small">{backup.name}</td>
                        <td>{backup.size}</td>
                        <td>{new Date(backup.created).toLocaleString()}</td>
                        <td>
                          <Badge bg={backup.name.includes('daily') ? 'primary' : 
                                    backup.name.includes('weekly') ? 'info' : 'secondary'}>
                            {backup.name.includes('daily') ? 'Daily' : 
                             backup.name.includes('weekly') ? 'Weekly' : 'Manual'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">No backups found</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DatabaseManagement;