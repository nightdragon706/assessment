template_string SQLAssistantPrompt #"
    You are an AI assistant specialized in generating SQL queries for app portfolio analytics.
    You help users analyze their app portfolio data by converting natural language questions into SQL queries.
    
    You have access to a database with the following schema:
    - apps table: id, name, platform (ios/android), country, revenue, popularity (downloads), uaSpend, createdAt, updatedAt
    - metrics table: id, appId, date, metricType, value, createdAt
    - queries table: id, userId, appId, queryText, sqlGenerated, result, timestamp
    
    Your capabilities:
    1. Generate SQL queries from natural language questions
    2. Execute queries and return results
    3. Provide insights and explanations about the data
    4. Suggest follow-up questions and analyses
    
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

class SQLQueryRequest {
    user_question string @description(#"
        The user's question or request in natural language.
    "#)
    context string? @description(#"
        Optional context about what the user is trying to analyze.
    "#)
}

class SQLQueryResponse {
    sql_query string @description(#"
        The generated SQL query.
    "#)
    explanation string @description(#"
        Explanation of what the query does and why it answers the user's question.
    "#)
    expected_result string? @description(#"
        Description of what the query result will show.
    "#)
    suggestions string[]? @description(#"
        Suggested follow-up questions or analyses.
    "#)
}

class ResponseSQLChat {
    answer string @stream.not_null @description(#"
        The assistant's response to the user's question.
    "#)
    @@dynamic
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
        
        Analyze the user's question and provide a helpful response. If they're asking for data analysis, generate appropriate SQL queries and explain them. Be conversational and helpful.

        {{ ctx.output_format }}
    "#
}

function GenerateSQLQuery(request: SQLQueryRequest) -> SQLQueryResponse {
    client CustomGPT41
    prompt #"
        {{ SQLAssistantPrompt() }}

        User Question: {{ request.user_question }}
        
        {% if request.context %}
        Context: {{ request.context }}
        {% endif %}

        Generate a SQL query that answers the user's question. The query should:
        1. Be a SELECT statement only (for security)
        2. Be well-formatted and readable
        3. Include appropriate aliases for clarity
        4. Use proper SQL syntax for SQLite
        
        Available tables:
        - apps: id, name, platform, country, revenue, popularity, uaSpend, createdAt, updatedAt
        - metrics: id, appId, date, metricType, value, createdAt
        - queries: id, userId, appId, queryText, sqlGenerated, result, timestamp

        {{ ctx.output_format }}
    "#
}

test TestSQLAssistant {
    functions [SQLAssistant]
    type_builder {
        dynamic class ResponseSQLChat {
            tool_calls (ExecuteSQLQuery | GetQueryTemplates | GetDatabaseStats)[]
        }
    }
    args {
        user_question "What are the top 3 apps by revenue?"
        messages [
            {role "user", content "Hi, I want to analyze my app portfolio data."},
            {role "assistant", content "Hello! I'm here to help you analyze your app portfolio data. I can generate SQL queries to answer questions about revenue, downloads, performance, and more. What would you like to know?"}
        ]
        context "User wants to understand their app portfolio performance"
    }
}

test TestGenerateSQLQuery {
    functions [GenerateSQLQuery]
    args {
        request {
            user_question "Show me the total revenue by platform"
            context "User is analyzing platform performance"
        }
    }
}
