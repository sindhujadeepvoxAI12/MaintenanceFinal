// test-voice-upload.js
// Simple test to check voice API responses
// Run this with: node test-voice-upload.js

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'https://backendaimaintenance.deepvox.ai/api/v1';

async function testVoiceAPI() {
  console.log('=== VOICE API RESPONSE TEST ===');
  
  try {
    // Test 1: Check API endpoint
    console.log('\n1. Testing API endpoint connectivity...');
    const headResponse = await fetch(`${BASE_URL}/upload-voice`, {
      method: 'HEAD'
    });
    console.log('HEAD Response Status:', headResponse.status);
    console.log('HEAD Response Headers:', Object.fromEntries(headResponse.headers.entries()));
    
    // Test 2: POST with empty FormData (to see error response)
    console.log('\n2. Testing POST with empty FormData...');
    const emptyFormData = new FormData();
    emptyFormData.append('audio', '', 'empty.m4a');
    
    const emptyResponse = await fetch(`${BASE_URL}/upload-voice`, {
      method: 'POST',
      body: emptyFormData
    });
    console.log('Empty POST Status:', emptyResponse.status);
    const emptyResult = await emptyResponse.text();
    console.log('Empty POST Response:', emptyResult);
    
    // Test 3: POST with test data
    console.log('\n3. Testing POST with test data...');
    const testFormData = new FormData();
    testFormData.append('audio', 'test-audio-data', {
      filename: 'test.m4a',
      contentType: 'audio/m4a'
    });
    
    const testResponse = await fetch(`${BASE_URL}/upload-voice`, {
      method: 'POST',
      body: testFormData
    });
    console.log('Test POST Status:', testResponse.status);
    const testResult = await testResponse.text();
    console.log('Test POST Response:', testResult);
    
    // Test 4: Check if we have a real audio file to test
    console.log('\n4. Testing with real audio file (if available)...');
    const audioFiles = ['./test-audio.m4a', './sample.m4a', './recording.m4a'];
    let foundAudioFile = null;
    
    for (const audioFile of audioFiles) {
      if (fs.existsSync(audioFile)) {
        foundAudioFile = audioFile;
        break;
      }
    }
    
    if (foundAudioFile) {
      console.log(`Found audio file: ${foundAudioFile}`);
      const realFormData = new FormData();
      realFormData.append('audio', fs.createReadStream(foundAudioFile), {
        filename: 'recording.m4a',
        contentType: 'audio/m4a'
      });
      
      const realResponse = await fetch(`${BASE_URL}/upload-voice`, {
        method: 'POST',
        body: realFormData
      });
      console.log('Real Audio POST Status:', realResponse.status);
      const realResult = await realResponse.text();
      console.log('Real Audio POST Response:', realResult);
      
      // Analyze the response
      console.log('\n--- RESPONSE ANALYSIS ---');
      console.log('Response Type:', typeof realResult);
      console.log('Response Length:', realResult.length);
      
      try {
        const jsonResult = JSON.parse(realResult);
        console.log('Response is JSON:', JSON.stringify(jsonResult, null, 2));
      } catch {
        console.log('Response is Plain Text:', realResult);
      }
      
    } else {
      console.log('No audio file found. Create test-audio.m4a to test with real audio.');
    }
    
    // Test 5: Different FormData formats
    console.log('\n5. Testing different FormData formats...');
    
    // Format A: React Native style
    const formatA = new FormData();
    formatA.append('audio', 'test-data-a', {
      filename: 'recording.m4a',
      contentType: 'audio/m4a',
      name: 'recording.m4a'
    });
    
    const responseA = await fetch(`${BASE_URL}/upload-voice`, {
      method: 'POST', 
      body: formatA
    });
    console.log('Format A Status:', responseA.status);
    console.log('Format A Response:', await responseA.text());
    
    // Format B: Simple format
    const formatB = new FormData();
    formatB.append('audio', 'test-data-b', 'recording.m4a');
    
    const responseB = await fetch(`${BASE_URL}/upload-voice`, {
      method: 'POST',
      body: formatB
    });
    console.log('Format B Status:', responseB.status);
    console.log('Format B Response:', await responseB.text());
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Show what responses mean
function analyzeResults() {
  console.log('\n=== HOW TO READ THE RESULTS ===');
  console.log('• Status 200: Success - API worked');
  console.log('• Status 400: Bad Request - Wrong data format');
  console.log('• Status 404: Not Found - Wrong endpoint');
  console.log('• Status 405: Method Not Allowed - Endpoint exists but wrong method');
  console.log('• Status 500: Server Error - Backend problem');
  console.log('');
  console.log('Response Types:');
  console.log('• Plain text transcription = API working correctly');
  console.log('• JSON with transcription field = API working correctly');
  console.log('• HTML error page = Wrong endpoint or server error');
  // console.log('• "Image file format mp4 not allowed" = Wrong API endpoint');
}

// Run the test
testVoiceAPI().then(() => {
  analyzeResults();
  console.log('\n=== TEST COMPLETE ===');
}).catch(error => {
  console.error('Test script failed:', error);
});