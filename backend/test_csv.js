// Test CSV parsing
const fs = require('fs');
const csv = require('csv-parser');
const { Readable } = require('stream');

async function testCSV() {
    try {
        const csvContent = fs.readFileSync('/tmp/visaovip.csv', 'utf-8');
        // console.log removed for production
        console.log('First 200 chars:', csvContent.substring(0, 200));
        
        const stream = Readable.from(csvContent);
        
        stream
            .pipe(csv({
                separator: ',',
                skipEmptyLines: true,
                skipLinesWithError: false
            }))
            .on('headers', (headers) => {
                // console.log removed for production
            })
            .on('data', (data) => {
                // console.log removed for production
            })
            .on('end', () => {
                // console.log removed for production
            })
            .on('error', (error) => {
                // console.error removed for production
            });
            
    } catch (error) {
        // console.error removed for production
    }
}

testCSV();
