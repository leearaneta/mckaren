import { main } from './src/etl/main';
import { mccarren } from './src/facilities';
import { cookies } from './src/etl/cookies';

// Add your debug code here
async function debug() {
  try {
    
    // Uncomment to run the full ETL
    cookies();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the debug function
debug(); 