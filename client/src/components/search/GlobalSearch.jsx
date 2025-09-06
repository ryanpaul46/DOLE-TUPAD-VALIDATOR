import { useState, useEffect, useCallback } from 'react';
import { Form, InputGroup, Button, Dropdown, Badge } from 'react-bootstrap';
import { Search, Filter, X } from 'react-bootstrap-icons';

const GlobalSearch = ({ onSearch, onFilter, filters = {}, placeholder = "Search beneficiaries..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState(filters);

  useEffect(() => {
    const timer = setTimeout(() => onSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...activeFilters };
    if (value) {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    setActiveFilters(newFilters);
    onFilter(newFilters);
  }, [activeFilters, onFilter]);

  const clearFilter = (key) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
    onFilter(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    onFilter({});
    onSearch('');
  };

  const filterCount = Object.keys(activeFilters).length;

  return (
    <div className="mb-3">
      <InputGroup>
        <InputGroup.Text>
          <Search size={16} />
        </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary">
            <Filter size={16} className="me-1" />
            Filters {filterCount > 0 && <Badge bg="primary" className="ms-1">{filterCount}</Badge>}
          </Dropdown.Toggle>
          <Dropdown.Menu style={{ minWidth: '300px' }}>
            <div className="p-3">
              <Form.Group className="mb-2">
                <Form.Label className="small fw-bold">Province</Form.Label>
                <Form.Select
                  size="sm"
                  value={activeFilters.province || ''}
                  onChange={(e) => handleFilterChange('province', e.target.value)}
                >
                  <option value="">All Provinces</option>
                  <option value="Ilocos Norte">Ilocos Norte</option>
                  <option value="Ilocos Sur">Ilocos Sur</option>
                  <option value="La Union">La Union</option>
                  <option value="Pangasinan">Pangasinan</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="small fw-bold">Gender</Form.Label>
                <Form.Select
                  size="sm"
                  value={activeFilters.sex || ''}
                  onChange={(e) => handleFilterChange('sex', e.target.value)}
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label className="small fw-bold">Age Range</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Min"
                    value={activeFilters.minAge || ''}
                    onChange={(e) => handleFilterChange('minAge', e.target.value)}
                  />
                  <Form.Control
                    size="sm"
                    type="number"
                    placeholder="Max"
                    value={activeFilters.maxAge || ''}
                    onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                  />
                </div>
              </Form.Group>
            </div>
          </Dropdown.Menu>
        </Dropdown>
        {(searchTerm || filterCount > 0) && (
          <Button variant="outline-danger" onClick={clearAllFilters}>
            <X size={16} />
          </Button>
        )}
      </InputGroup>
      
      {filterCount > 0 && (
        <div className="mt-2">
          {Object.entries(activeFilters).map(([key, value]) => (
            <Badge 
              key={key} 
              bg="secondary" 
              className="me-2 mb-1"
              style={{ cursor: 'pointer' }}
              onClick={() => clearFilter(key)}
            >
              {key}: {value} <X size={12} className="ms-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;