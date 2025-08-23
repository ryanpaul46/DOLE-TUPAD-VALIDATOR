import { useState, useEffect } from "react";
import { Table, Pagination, Card, Row, Col } from "react-bootstrap";
import api from "../api/axios";

export default function DatabaseTable() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20; // Increased items per page

  const fetchData = async () => {
    try {
      // Fetch column information
      const columnsRes = await api.get("/uploaded-columns");
      setColumns(columnsRes.data.filter(col => col.column_name !== 'id')); // Exclude ID column
      
      // Fetch data
      const dataRes = await api.get("/uploaded-beneficiaries");
      setData(dataRes.data);
    } catch (err) {
      console.error("Failed fetching database:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Pagination logic
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentData = data.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(data.length / rowsPerPage);

  // Format column names for display
  const formatColumnName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Simplified pagination - show only current page and nearby pages
  const getVisiblePages = () => {
    const delta = 1; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <Row>
      <Col>
        <Card>
          <Card.Header>Uploaded Data</Card.Header>
          <Card.Body className="p-0">
            <div className="table-container" style={{ maxHeight: "60vh", overflow: "auto" }}>
              <Table striped bordered hover size="sm" className="table-layout-auto mb-0">
                <thead className="position-sticky top-0 bg-light">
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx} className="align-middle">
                        {formatColumnName(col.column_name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {columns.map((col, colIdx) => (
                        <td key={colIdx} className="align-middle">
                          {row[col.column_name] !== null ? String(row[col.column_name]) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
          <Card.Footer>
            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-2">
                <Pagination size="sm" className="mb-0">
                  <Pagination.Prev
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  />
                  
                  {getVisiblePages().map((page, idx) => (
                    <Pagination.Item
                      key={idx}
                      active={currentPage === page}
                      onClick={() => typeof page === 'number' && setCurrentPage(page)}
                      disabled={typeof page !== 'number'}
                    >
                      {page}
                    </Pagination.Item>
                  ))}
                  
                  <Pagination.Next
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  />
                </Pagination>
              </div>
            )}
          </Card.Footer>
        </Card>
      </Col>
    </Row>
  );
}
