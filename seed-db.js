const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Starting database seed...')

    // Clear existing data
    await prisma.metric.deleteMany()
    await prisma.query.deleteMany()
    await prisma.app.deleteMany()

    console.log('Cleared existing data')

    // Create sample apps
    const apps = await Promise.all([
        prisma.app.create({
            data: {
                name: 'TikTok',
                platform: 'ios',
                country: 'United States',
                revenue: 1500000,
                popularity: 50000000,
                uaSpend: 250000,
            },
        }),
        prisma.app.create({
            data: {
                name: 'Instagram',
                platform: 'android',
                country: 'United States',
                revenue: 1200000,
                popularity: 45000000,
                uaSpend: 200000,
            },
        }),
        prisma.app.create({
            data: {
                name: 'WhatsApp',
                platform: 'ios',
                country: 'India',
                revenue: 800000,
                popularity: 35000000,
                uaSpend: 150000,
            },
        }),
        prisma.app.create({
            data: {
                name: 'Spotify',
                platform: 'android',
                country: 'Sweden',
                revenue: 900000,
                popularity: 30000000,
                uaSpend: 180000,
            },
        }),
        prisma.app.create({
            data: {
                name: 'Netflix',
                platform: 'ios',
                country: 'United States',
                revenue: 2000000,
                popularity: 25000000,
                uaSpend: 300000,
            },
        }),
    ])

    console.log('Created apps:', apps.length)

    // Create sample metrics
    for (const app of apps) {
        await prisma.metric.createMany({
            data: [
                {
                    appId: app.id,
                    date: new Date('2024-01-01'),
                    metricType: 'revenue',
                    value: app.revenue * 0.8,
                },
                {
                    appId: app.id,
                    date: new Date('2024-01-01'),
                    metricType: 'downloads',
                    value: app.popularity * 0.7,
                },
                {
                    appId: app.id,
                    date: new Date('2024-02-01'),
                    metricType: 'revenue',
                    value: app.revenue * 0.9,
                },
                {
                    appId: app.id,
                    date: new Date('2024-02-01'),
                    metricType: 'downloads',
                    value: app.popularity * 0.8,
                },
            ],
        })
    }

    console.log('Database seeded successfully!')
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
