import { useState, useEffect } from "react";
import { Container, Table } from "react-bootstrap";
import axios from "axios";

export default function ClientDatabase() {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/uploaded-beneficiaries");
      setData(res.data);
    } catch (err) {
      console.error("Failed fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Container fluid className="p-4 flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
      <h2>Database</h2>

      <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Project Series No.</th>
              <th>Municipality/City</th>
              <th>Province</th>
              <th>No. of Beneficiaries</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr key={idx}>
                <td>{row.project_series}</td>
                <td>{row.city_municipality}</td>
                <td>{row.province}</td>
                <td>1</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 mt-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
          <span className="align-self-center">Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </Container>
  );
}
