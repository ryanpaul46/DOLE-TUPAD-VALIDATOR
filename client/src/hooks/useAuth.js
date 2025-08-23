import { useEffect, useState } from 'react';
import api from '../api/axios';


export default function useAuth() {
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);


useEffect(() => {
async function fetchMe() {
try {
const { data } = await api.get('/auth/me');
setUser(data);
} catch {
setUser(null);
} finally {
setLoading(false);
}
}
const token = localStorage.getItem('token');
if (token) fetchMe(); else setLoading(false);
}, []);


return { user, setUser, loading };
}