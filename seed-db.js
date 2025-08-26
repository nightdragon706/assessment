const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Starting database seed...')

    // Clear existing data
    await prisma.query.deleteMany()
    await prisma.app.deleteMany()

    console.log('Cleared existing data')

    // Create sample apps with the exact schema requirements
    const apps = await Promise.all([
        // TikTok - Multiple entries for different dates/countries
        prisma.app.create({
            data: {
                appName: 'TikTok',
                platform: 'ios',
                date: new Date('2025-01-15'),
                country: 'United States',
                installs: 5000000,
                inAppRevenue: 1500000,
                adsRevenue: 800000,
                uaCost: 250000,
            },
        }),
        prisma.app.create({
            data: {
                appName: 'TikTok',
                platform: 'android',
                date: new Date('2025-01-15'),
                country: 'United States',
                installs: 8000000,
                inAppRevenue: 1200000,
                adsRevenue: 600000,
                uaCost: 300000,
            },
        }),
        prisma.app.create({
            data: {
                appName: 'TikTok',
                platform: 'ios',
                date: new Date('2025-01-15'),
                country: 'India',
                installs: 3000000,
                inAppRevenue: 400000,
                adsRevenue: 200000,
                uaCost: 150000,
            },
        }),

        // Instagram
        prisma.app.create({
            data: {
                appName: 'Instagram',
                platform: 'ios',
                date: new Date('2025-01-15'),
                country: 'United States',
                installs: 3000000,
                inAppRevenue: 800000,
                adsRevenue: 1200000,
                uaCost: 200000,
            },
        }),
        prisma.app.create({
            data: {
                appName: 'Instagram',
                platform: 'android',
                date: new Date('2025-01-15'),
                country: 'United States',
                installs: 4500000,
                inAppRevenue: 600000,
                adsRevenue: 900000,
                uaCost: 250000,
            },
        }),

        // WhatsApp
        prisma.app.create({
            data: {
                appName: 'WhatsApp',
                platform: 'ios',
                date: new Date('2025-01-15'),
                country: 'India',
                installs: 2000000,
                inAppRevenue: 200000,
                adsRevenue: 0,
                uaCost: 100000,
            },
        }),
        prisma.app.create({
            data: {
                appName: 'WhatsApp',
                platform: 'android',
                date: new Date('2025-01-15'),
                country: 'India',
                installs: 8000000,
                inAppRevenue: 300000,
                adsRevenue: 0,
                uaCost: 120000,
            },
        }),

        // Spotify
        prisma.app.create({
            data: {
                appName: 'Spotify',
                platform: 'ios',
                date: new Date('2025-01-15'),
                country: 'Sweden',
                installs: 1500000,
                inAppRevenue: 900000,
                adsRevenue: 200000,
                uaCost: 180000,
            },
        }),
        prisma.app.create({
            data: {
                appName: 'Spotify',
                platform: 'android',
                date: new Date('2025-01-15'),
                country: 'Sweden',
                installs: 2000000,
                inAppRevenue: 700000,
                adsRevenue: 150000,
                uaCost: 200000,
            },
        }),

        // Netflix
        prisma.app.create({
            data: {
                appName: 'Netflix',
                platform: 'ios',
                date: new Date('2025-01-15'),
                country: 'United States',
                installs: 1000000,
                inAppRevenue: 2000000,
                adsRevenue: 0,
                uaCost: 300000,
            },
        }),
        prisma.app.create({
            data: {
                appName: 'Netflix',
                platform: 'android',
                date: new Date('2025-01-15'),
                country: 'United States',
                installs: 1200000,
                inAppRevenue: 1800000,
                adsRevenue: 0,
                uaCost: 280000,
            },
        }),

        // Add some historical data for trend analysis
        prisma.app.create({
            data: {
                appName: 'TikTok',
                platform: 'ios',
                date: new Date('2024-12-15'),
                country: 'United States',
                installs: 4500000,
                inAppRevenue: 1300000,
                adsRevenue: 700000,
                uaCost: 220000,
            },
        }),
        prisma.app.create({
            data: {
                appName: 'Instagram',
                platform: 'ios',
                date: new Date('2024-12-15'),
                country: 'United States',
                installs: 2800000,
                inAppRevenue: 750000,
                adsRevenue: 1100000,
                uaCost: 180000,
            },
        }),
        prisma.app.create({
            data: {
                appName: 'Netflix',
                platform: 'ios',
                date: new Date('2024-12-15'),
                country: 'United States',
                installs: 900000,
                inAppRevenue: 1900000,
                adsRevenue: 0,
                uaCost: 250000,
            },
        }),
    ])

    console.log('Created apps:', apps.length)
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
