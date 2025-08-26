export interface SQLTemplate {
    id: string
    name: string
    description: string
    sql: string
    parameters: string[]
    category: 'revenue' | 'downloads' | 'performance' | 'comparison' | 'trends'
}

export const SQL_TEMPLATES: SQLTemplate[] = [
    {
        id: 'total-revenue',
        name: 'Total Revenue',
        description: 'Get total revenue across all apps',
        sql: 'SELECT SUM(revenue) as total_revenue FROM apps',
        parameters: [],
        category: 'revenue'
    },
    {
        id: 'revenue-by-platform',
        name: 'Revenue by Platform',
        description: 'Get revenue breakdown by platform (iOS vs Android)',
        sql: 'SELECT platform, SUM(revenue) as total_revenue FROM apps GROUP BY platform',
        parameters: [],
        category: 'revenue'
    },
    {
        id: 'top-revenue-apps',
        name: 'Top Revenue Apps',
        description: 'Get top 5 apps by revenue',
        sql: 'SELECT name, platform, country, revenue FROM apps ORDER BY revenue DESC LIMIT 5',
        parameters: [],
        category: 'revenue'
    },
    {
        id: 'revenue-by-country',
        name: 'Revenue by Country',
        description: 'Get revenue breakdown by country',
        sql: 'SELECT country, SUM(revenue) as total_revenue FROM apps GROUP BY country ORDER BY total_revenue DESC',
        parameters: [],
        category: 'revenue'
    },
    {
        id: 'total-downloads',
        name: 'Total Downloads',
        description: 'Get total downloads across all apps',
        sql: 'SELECT SUM(popularity) as total_downloads FROM apps',
        parameters: [],
        category: 'downloads'
    },
    {
        id: 'downloads-by-platform',
        name: 'Downloads by Platform',
        description: 'Get downloads breakdown by platform',
        sql: 'SELECT platform, SUM(popularity) as total_downloads FROM apps GROUP BY platform',
        parameters: [],
        category: 'downloads'
    },
    {
        id: 'top-downloaded-apps',
        name: 'Top Downloaded Apps',
        description: 'Get top 5 apps by downloads',
        sql: 'SELECT name, platform, country, popularity FROM apps ORDER BY popularity DESC LIMIT 5',
        parameters: [],
        category: 'downloads'
    },
    {
        id: 'ua-spend-analysis',
        name: 'UA Spend Analysis',
        description: 'Get total UA spend and ROI analysis',
        sql: 'SELECT SUM(uaSpend) as total_ua_spend, SUM(revenue) as total_revenue, (SUM(revenue) - SUM(uaSpend)) as net_profit FROM apps',
        parameters: [],
        category: 'performance'
    },
    {
        id: 'roi-by-app',
        name: 'ROI by App',
        description: 'Calculate ROI (Revenue - UA Spend) for each app',
        sql: 'SELECT name, platform, revenue, uaSpend, (revenue - uaSpend) as roi FROM apps ORDER BY roi DESC',
        parameters: [],
        category: 'performance'
    },
    {
        id: 'platform-comparison',
        name: 'Platform Comparison',
        description: 'Compare iOS vs Android performance metrics',
        sql: 'SELECT platform, AVG(revenue) as avg_revenue, AVG(popularity) as avg_downloads, AVG(uaSpend) as avg_ua_spend FROM apps GROUP BY platform',
        parameters: [],
        category: 'comparison'
    },
    {
        id: 'country-performance',
        name: 'Country Performance',
        description: 'Get performance metrics by country',
        sql: 'SELECT country, COUNT(*) as app_count, AVG(revenue) as avg_revenue, AVG(popularity) as avg_downloads FROM apps GROUP BY country ORDER BY avg_revenue DESC',
        parameters: [],
        category: 'comparison'
    },
    {
        id: 'revenue-trends',
        name: 'Revenue Trends',
        description: 'Get revenue trends over time (requires metrics table)',
        sql: 'SELECT DATE(m.date) as date, SUM(m.value) as daily_revenue FROM metrics m WHERE m.metricType = "revenue" GROUP BY DATE(m.date) ORDER BY date DESC LIMIT 30',
        parameters: [],
        category: 'trends'
    },
    {
        id: 'download-trends',
        name: 'Download Trends',
        description: 'Get download trends over time (requires metrics table)',
        sql: 'SELECT DATE(m.date) as date, SUM(m.value) as daily_downloads FROM metrics m WHERE m.metricType = "downloads" GROUP BY DATE(m.date) ORDER BY date DESC LIMIT 30',
        parameters: [],
        category: 'trends'
    }
]

export function getTemplateById(id: string): SQLTemplate | undefined {
    return SQL_TEMPLATES.find(template => template.id === id)
}

export function getTemplatesByCategory(category: SQLTemplate['category']): SQLTemplate[] {
    return SQL_TEMPLATES.filter(template => template.category === category)
}

export function getAllTemplates(): SQLTemplate[] {
    return SQL_TEMPLATES
}
