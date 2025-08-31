import { useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { ExclamationTriangle } from 'react-bootstrap-icons';
import api from '../api/axios';

export default function DirectUpload({ onDataRefresh }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("excelFile", file);

    try {
      setLoading(true);
      await api.post("/api/upload-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      onDataRefresh();
      setFile(null);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear all data?")) return;
    
    try {
      setLoading(true);
      await api.delete("/api/uploaded-beneficiaries");
      onDataRefresh();
    } catch (err) {
      console.error("Failed to clear data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h6 className="text-warning mb-2">
        <ExclamationTriangle size={16} className="me-1" />
        Direct Upload (No Duplicate Check)
      </h6>
      <p className="text-muted small mb-2">
        Upload Excel file directly without duplicate scanning
      </p>
      <div className="d-flex gap-2 flex-wrap align-items-center">
        <Form.Control
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ maxWidth: "300px" }}
        />
        <Button
          variant="primary"
          onClick={handleUpload}
          disabled={loading || !file}
          size="sm"
        >
          {loading ? <Spinner size="sm" animation="border" /> : "Upload Excel"}
        </Button>
        <Button
          variant="danger"
          onClick={handleClear}
          disabled={loading}
          size="sm"
        >
          {loading ? <Spinner size="sm" animation="border" /> : "Clear Database"}
        </Button>
      </div>
    </div>
  );
}