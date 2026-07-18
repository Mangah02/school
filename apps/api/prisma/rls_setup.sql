-- Enable RLS
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY tenant_isolation_users ON "users" USING (school_id = current_setting('app.current_school_id')::uuid);
CREATE POLICY tenant_isolation_students ON "students" USING (school_id = current_setting('app.current_school_id')::uuid);