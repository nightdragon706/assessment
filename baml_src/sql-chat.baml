template_string SQLAssistantPrompt #"
    You are an AI assistant specialized in generating SQL queries for app portfolio analytics.
    You help users analyze their app portfolio data by converting natural language questions into SQL queries.
    
    You have access to a database with the following schema:
    - apps table: id, appName, platform (ios/android), date, country, installs, inAppRevenue, adsRevenue, uaCost, createdAt, updatedAt
    - queries table: id, userId, appId, queryText, sqlGenerated, result, timestamp
    
    IMPORTANT: Always generate SQLite-compatible queries. Use SQLite syntax and functions:
    - Use strftime() for date functions instead of DATE_TRUNC()
    - Use date() and datetime() functions for date operations
    - Avoid PostgreSQL-specific functions like INTERVAL
    - Use SQLite date arithmetic: date('now', '-1 month') instead of CURRENT_DATE - INTERVAL '1 month'
    - IMPORTANT: Date fields are stored as milliseconds since epoch, so convert them: datetime(updatedAt/1000, 'unixepoch')
    - For date filtering: strftime('%Y-%m', datetime(updatedAt/1000, 'unixepoch')) = strftime('%Y-%m', date('now'))
    
    Always ensure SQL queries are safe (SELECT only) and well-formatted.
    If the user's question is off-topic (not related to app portfolio analytics like apps, revenue, installs, platforms, countries, time ranges, or comparisons),
    politely steer them back to analytics and DO NOT call any tools. Provide a brief explanation that you focus on app portfolio analytics.
    
    Guardrails:
    - Do not make up numbers. Always use real data from the database.
    - Decide and set 'display_table': true when the expected/returned results are multi-row or detailed breakdowns; false when a single aggregate/number is sufficient
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
    display_table bool? @description(#"
        Whether the results should be displayed in a table format. True for multi-row or detailed outputs; false for simple single values.
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
        
        {% if context %}
        Context: {{ context }}
        {% endif %}

        {{ SQLConversationHistory(messages) }}

        {% if user_question %}
            {{ _.role("user") }}
            User message: {{ user_question }}
        {% endif %}

        {{ _.role("system") }}

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