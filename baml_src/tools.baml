class ExecuteSQLQuery {
    name "execute_sql_query" @description(#"
        Execute a SQL query against the app portfolio database.
    "#)
    sql_query string @description(#"
        The SQL query to execute. Must be a SELECT statement for security.
    "#)
    query_description string @description(#"
        A brief description of what this query does.
    "#)
}

class GetQueryTemplates {
    name "get_query_templates" @description(#"
        Get available SQL query templates for common analytics tasks.
    "#)
    category string? @description(#"
        Optional category filter: 'revenue', 'downloads', 'performance', 'comparison', 'trends'
    "#)
}

class GetDatabaseStats {
    name "get_database_stats" @description(#"
        Get basic statistics about the app portfolio database.
    "#)
}