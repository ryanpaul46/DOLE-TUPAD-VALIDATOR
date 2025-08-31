import { useMemo } from 'react';

export const useRoleAccess = (role) => {
  const permissions = useMemo(() => {
    const basePermissions = {
      canView: true,
      canSearch: true,
      canExport: false,
      canUpload: false,
      canDelete: false,
      canManageDuplicates: false,
      canViewSensitiveData: false
    };

    switch (role) {
      case 'admin':
        return {
          ...basePermissions,
          canExport: true,
          canUpload: true,
          canDelete: true,
          canManageDuplicates: true,
          canViewSensitiveData: true
        };
      
      case 'client':
        return {
          ...basePermissions,
          canExport: true,
          canManageDuplicates: true
        };
      
      default:
        return basePermissions;
    }
  }, [role]);

  return permissions;
};