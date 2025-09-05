-- Add created_at and updated_at columns to uploaded_beneficiaries table if they don't exist

DO $$ 
BEGIN
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploaded_beneficiaries' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE uploaded_beneficiaries 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records with a default timestamp
        UPDATE uploaded_beneficiaries 
        SET created_at = NOW() - INTERVAL '1 day' * (id % 30)
        WHERE created_at IS NULL;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploaded_beneficiaries' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE uploaded_beneficiaries 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records with a default timestamp
        UPDATE uploaded_beneficiaries 
        SET updated_at = created_at
        WHERE updated_at IS NULL;
    END IF;
    
    -- Add created_at column to users table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records with a default timestamp
        UPDATE users 
        SET created_at = NOW() - INTERVAL '1 day' * (id % 10)
        WHERE created_at IS NULL;
    END IF;
END $$;

-- Create indexes for better performance on timestamp queries
CREATE INDEX IF NOT EXISTS idx_uploaded_beneficiaries_created_at 
ON uploaded_beneficiaries(created_at);

CREATE INDEX IF NOT EXISTS idx_users_created_at 
ON users(created_at);