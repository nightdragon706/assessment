template_string SQLAssistantPrompt #"
    You are an AI assistant specialized in generating SQL queries for app portfolio analytics.
    You help users analyze their app portfolio data by converting natural language questions into SQL queries.
    
    You have access to a database with the following schema:
    - apps table: id, appName, platform (ios/android), date, country, installs, inAppRevenue, adsRevenue, uaCost, createdAt, updatedAt
    - queries table: id, userId, appId, queryText, sqlGenerated, result, timestamp
    
    Your capabilities:
    1. Generate SQL queries from natural language questions
    2. Execute queries and return results
    3. Provide insights and explanations about the data
    4. Suggest follow-up questions and analyses
    
    IMPORTANT: Always generate SQLite-compatible queries. Use SQLite syntax and functions:
    - Use strftime() for date functions instead of DATE_TRUNC()
    - Use date() and datetime() functions for date operations
    - Avoid PostgreSQL-specific functions like INTERVAL
    - Use SQLite date arithmetic: date('now', '-1 month') instead of CURRENT_DATE - INTERVAL '1 month'
    - IMPORTANT: Date fields are stored as milliseconds since epoch, so convert them: datetime(updatedAt/1000, 'unixepoch')
    - For date filtering: strftime('%Y-%m', datetime(updatedAt/1000, 'unixepoch')) = strftime('%Y-%m', date('now'))
    
    Always ensure SQL queries are safe (SELECT only) and well-formatted.
"#

class SQLMessage {
    role "user" | "assistant" @description(#"
        The role of the message.
    "#)
    content string @description(#"
        The content of the message.
    "#)
    timestamp string? @description(#"
        Optional timestamp of the message.
    "#)
}

template_string SQLConversationHistory(messages: SQLMessage[]) #"
    {% if messages %}
        Here is the recent conversation history:
        {% for message in messages %}
            {{ _.role(message.role) }}: {{ message.content }}
        {% endfor %}
    {% else %}
        ""
    {% endif %}
"#

class ResponseSQLChat {
    answer string @stream.not_null @description(#"
        The assistant's response to the user's question.
    "#)
    tool_calls (ExecuteSQLQuery | ShowSQLQuery | ExportCSV)[]? @description(#"
        Tool calls to execute SQL queries or get data.
    "#)
}

function SQLAssistant(
    user_question: string, 
    messages: SQLMessage[], 
    context: string?
) -> ResponseSQLChat {
    client CustomGPT41
    prompt #"
        {{ SQLAssistantPrompt() }}

        User Question: {{ user_question }}
        
        {% if context %}
        Context: {{ context }}
        {% endif %}

        {{ SQLConversationHistory(messages) }}

        {{ _.role("system") }}
        
        You are a data analytics assistant with access to tools. You MUST use the execute_sql_query tool for data questions.
        If the user's question is off-topic (not related to app portfolio analytics like apps, revenue, installs, platforms, countries, time ranges, or comparisons),
        politely steer them back to analytics and DO NOT call any tools. Provide a brief explanation that you focus on app portfolio analytics.
        
        Available tools:
        - execute_sql_query: Execute SQL queries against the database
        - show_sql_query: Show the SQL query used to answer the user's question
        - export_csv: Export the data from the SQL query to a CSV file
        
        For ANY question about data (apps, revenue, installs, platforms, countries):
        1. Generate the appropriate SQL query
        2. Use the execute_sql_query tool to run it
        3. Provide the actual results from the database
        
        Do not make up numbers. Always use real data from the database.
        
        IMPORTANT: 
        - Provide a brief acknowledgment in the 'answer' field (e.g., "Let me check the database for you.")
        - Use the 'tool_calls' field to execute SQL queries
        - Do NOT put tool calls inside the answer text
        - Do NOT provide final answers with numbers - the SQL execution will provide the actual data

        {{ ctx.output_format }}
    "#
}

test TestSQLAssistant {
    functions [SQLAssistant]
    args {
        user_question "how many android apps do we have?"
        messages [
            {role "user", content "Hi, I want to analyze my app portfolio data."},
            {role "assistant", content "Hello! I'm here to help you analyze your app portfolio data. I can generate SQL queries to answer questions about revenue, downloads, performance, and more. What would you like to know?"}
        ]
        context "User wants to understand their app portfolio performance"
    }
}