import { pptc } from './src/facilities';

// Add your debug code here
async function debug() {
  try {
    
    // Uncomment to run the full ETL
    pptc.extractHeaders();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the debug function
debug(); 