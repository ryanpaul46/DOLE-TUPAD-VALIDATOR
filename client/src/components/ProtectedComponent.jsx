import { useRoleAccess } from '../hooks/useRoleAccess';

export default function ProtectedComponent({ 
  role, 
  permission, 
  children, 
  fallback = null 
}) {
  const permissions = useRoleAccess(role);
  
  if (!permissions[permission]) {
    return fallback;
  }
  
  return children;
}