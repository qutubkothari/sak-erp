#!/bin/bash
# Check and setup Sales Module tables

echo "=== Checking Sales Module Tables ===" 

# Connection details from environment
PGHOST="aws-0-ap-south-1.pooler.supabase.com"
PGPORT="6543"
PGDATABASE="postgres"
PGUSER="postgres.jvklxdqknudjodxihkvb"

# Check if tables exist
echo "Checking for customers table..."
CUSTOMER_EXISTS=$(PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers');")

if [[ $CUSTOMER_EXISTS == *"t"* ]]; then
    echo "✓ Sales tables exist"
    
    # Count records
    echo ""
    echo "=== Current Data ==="
    PGPASSWORD=$SUPABASE_DB_PASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "
        SELECT 
            'customers' as table_name, COUNT(*) as count 
        FROM customers 
        UNION ALL
        SELECT 'quotations', COUNT(*) FROM quotations
        UNION ALL
        SELECT 'sales_orders', COUNT(*) FROM sales_orders
        UNION ALL
        SELECT 'dispatch_notes', COUNT(*) FROM dispatch_notes
        UNION ALL
        SELECT 'warranties', COUNT(*) FROM warranties;
    "
else
    echo "⚠ Sales tables not found. Run migration:"
    echo "cd /home/ubuntu/sak-erp/migrations"
    echo "PGPASSWORD=\$SUPABASE_DB_PASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f create-sales-dispatch.sql"
fi

echo ""
echo "=== Sales Module Status ==="
