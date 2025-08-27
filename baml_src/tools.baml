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

class ShowSQLQuery {
    name "show_sql_query" @description(#"
        Show the SQL query used to answer the user's question to the user.
    "#)
    sql_query string @description(#"
        The SQL query to show.
    "#)
}

class ExportCSV {
    name "export_csv" @description(#"
        Export the data from the SQL query to a CSV file.
    "#)
    csv_file_name string @description(#"
        The name of the CSV file to export.
    "#)
}