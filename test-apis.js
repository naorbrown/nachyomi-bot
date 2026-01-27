/**
 * Test script to verify API integrations work correctly
 * Run with: node test-apis.js
 */

import { getTodaysNachYomi, getNachYomiForDate } from './src/hebcalService.js';
import { getChapterText } from './src/sefariaService.js';
import { buildDailyMessage, buildKeyboard } from './src/messageBuilder.js';
import { getShiurUrl, getSefariaUrl } from './src/data/shiurMapping.js';

async function runTests() {
  console.log('🧪 Running Nach Yomi Bot API Tests\n');
  console.log('━'.repeat(50));

  let allPassed = true;

  // Test 1: Hebcal API
  console.log('\n📅 Test 1: Hebcal Nach Yomi API');
  try {
    const nachYomi = await getTodaysNachYomi();
    console.log(`   ✅ Today's Nach Yomi: ${nachYomi.book} Chapter ${nachYomi.chapter}`);
    console.log(`   📖 Hebrew: ${nachYomi.hebrew}`);
    console.log(`   🗓  Date: ${nachYomi.hebrewDate}`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    allPassed = false;
  }

  // Test 2: Sefaria API
  console.log('\n📜 Test 2: Sefaria Text API');
  try {
    // Test with Joshua 1 (always available)
    const text = await getChapterText('Joshua', 1, { maxVerses: 3 });
    console.log(`   ✅ Fetched ${text.book} Chapter ${text.chapter}`);
    console.log(`   📚 Total verses: ${text.totalVerses}`);
    console.log(`   🔗 URL: ${text.sefariaUrl}`);
    if (text.hebrewText?.[0]) {
      const preview = text.hebrewText[0].substring(0, 50) + '...';
      console.log(`   📖 First verse preview: ${preview}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    allPassed = false;
  }

  // Test 3: Shiur URL generation
  console.log('\n🎧 Test 3: Kol Halashon URL Generation');
  try {
    const shiurUrl = getShiurUrl('Joshua', 1);
    console.log(`   ✅ Joshua 1 shiur: ${shiurUrl}`);

    const shiurUrl2 = getShiurUrl('Isaiah', 5);
    console.log(`   ✅ Isaiah 5 shiur: ${shiurUrl2}`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    allPassed = false;
  }

  // Test 4: Message Builder
  console.log('\n📝 Test 4: Message Builder');
  try {
    const nachYomi = await getTodaysNachYomi();
    const text = await getChapterText(nachYomi.book, nachYomi.chapter, { maxVerses: 3 });
    const message = buildDailyMessage(nachYomi, text);
    const keyboard = buildKeyboard(nachYomi.book, nachYomi.chapter);

    console.log(`   ✅ Message built successfully (${message.length} chars)`);
    console.log(`   ✅ Keyboard has ${keyboard.inline_keyboard.length} rows`);

    // Show a preview
    console.log('\n   📱 Message Preview:');
    console.log('   ' + '─'.repeat(40));
    const previewLines = message.split('\n').slice(0, 10);
    previewLines.forEach(line => console.log('   │ ' + line));
    console.log('   │ ...');
    console.log('   ' + '─'.repeat(40));
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    allPassed = false;
  }

  // Test 5: Tomorrow's Nach Yomi
  console.log('\n⏭️  Test 5: Tomorrow\'s Nach Yomi');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nachYomi = await getNachYomiForDate(tomorrow);
    if (nachYomi) {
      console.log(`   ✅ Tomorrow: ${nachYomi.book} Chapter ${nachYomi.chapter}`);
    } else {
      console.log(`   ⚠️  No Nach Yomi found for tomorrow`);
    }
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    allPassed = false;
  }

  // Summary
  console.log('\n' + '━'.repeat(50));
  if (allPassed) {
    console.log('✅ All tests passed! The bot is ready to run.');
    console.log('\nTo start the bot:');
    console.log('  export TELEGRAM_BOT_TOKEN="your-token"');
    console.log('  npm start');
  } else {
    console.log('❌ Some tests failed. Please check the errors above.');
  }
  console.log('━'.repeat(50) + '\n');
}

runTests().catch(console.error);
