// Test CSV parsing
const fs = require('fs');
const csv = require('csv-parser');
const { Readable } = require('stream');

async function testCSV() {
    try {
        const csvContent = fs.readFileSync('/tmp/visaovip.csv', 'utf-8');
        console.log('CSV content length:', csvContent.length);
        console.log('First 200 chars:', csvContent.substring(0, 200));
        
        const stream = Readable.from(csvContent);
        
        stream
            .pipe(csv({
                separator: ',',
                skipEmptyLines: true,
                skipLinesWithError: false
            }))
            .on('headers', (headers) => {
                console.log('Headers found:', headers);
            })
            .on('data', (data) => {
                console.log('First row:', data);
            })
            .on('end', () => {
                console.log('CSV parsing completed');
            })
            .on('error', (error) => {
                console.error('Error:', error);
            });
            
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testCSV();
