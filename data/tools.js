/*
 * Toolshed catalogue. To add a tool, add a row to TOOLS and open a pull request.
 * Row: [category id, name, description, tags (comma separated), href (optional, omit while not built)]
 * Plain script (no modules) so the site also works when opened from disk.
 */
(function () {
  var CATEGORIES = [
    { id: 'image', name: 'Image', blurb: 'Resize, compress and convert pictures without uploading them.' },
    { id: 'pdf', name: 'PDF', blurb: 'Merge, split and reshuffle pages, all on your own machine.' },
    { id: 'text', name: 'Text', blurb: 'Count, clean up and compare words.' },
    { id: 'developer', name: 'Developer', blurb: 'Small utilities for the daily grind of code.' },
    { id: 'data', name: 'Data', blurb: 'Move tables and records between formats.' },
    { id: 'colour', name: 'Colour', blurb: 'Pick, mix and check colours.' },
    { id: 'calculators', name: 'Calculators', blurb: 'Quick sums for everyday questions.' },
    { id: 'converters', name: 'Converters', blurb: 'From one unit or base to another.' },
    { id: 'time', name: 'Time', blurb: 'Dates, zones and countdowns.' },
    { id: 'security', name: 'Security', blurb: 'Passwords and hashes, generated locally.' },
    { id: 'encoding', name: 'Encoding', blurb: 'Encode and decode the formats the web speaks.' },
    { id: 'math', name: 'Math', blurb: 'Numbers, fractions and statistics.' },
    { id: 'web', name: 'Web', blurb: 'Helpers for sites, links and sharing.' },
    { id: 'productivity', name: 'Productivity', blurb: 'Focus, plan and jot things down.' },
    { id: 'fun', name: 'Fun', blurb: 'Dice, coins and other tie-breakers.' }
  ];

  var ROWS = [
    ['image', 'Image resize & compress', 'Shrink photos by size or quality and download the result.', 'resize,compress,jpg,png,webp', 'tools/image.html'],
    ['image', 'Crop & rotate', 'Trim to a region, then rotate or flip.', 'crop,rotate,flip'],
    ['image', 'Format converter', 'Switch between PNG, JPG and WebP.', 'convert,png,jpg,webp'],
    ['image', 'EXIF viewer', 'See the metadata hiding inside a photo.', 'metadata,exif,privacy'],
    ['image', 'Image to Base64', 'Turn a small image into a data URI.', 'base64,encode'],
    ['image', 'Favicon maker', 'Make favicon sizes from one picture.', 'favicon,resize,web'],

    ['pdf', 'PDF merge & split', 'Join several PDFs into one, or cut one into parts.', 'merge,split', 'tools/pdf.html'],
    ['pdf', 'Reorder pages', 'Drag pages into a new order.', 'reorder,pages', 'tools/pdf.html'],
    ['pdf', 'Extract pages', 'Keep only the pages you pick.', 'extract,pages', 'tools/pdf.html'],
    ['pdf', 'Remove pages', 'Delete the pages you do not want.', 'remove,pages', 'tools/pdf.html'],
    ['pdf', 'Images to PDF', 'Combine pictures into a single PDF.', 'images,convert'],

    ['text', 'Word counter', 'Words, characters, sentences and reading time.', 'count,words,reading time'],
    ['text', 'Case converter', 'UPPER, lower, Title and camelCase in a click.', 'case,format'],
    ['text', 'Diff checker', 'Compare two texts and see what changed.', 'compare,diff'],
    ['text', 'Lorem ipsum generator', 'Placeholder paragraphs on demand.', 'placeholder,generate'],
    ['text', 'Duplicate line remover', 'Strip repeated lines and sort the rest.', 'clean,sort'],

    ['developer', 'JSON formatter', 'Pretty-print, minify and validate JSON.', 'json,format,validate'],
    ['developer', 'Regex tester', 'Try a pattern against sample text live.', 'regex,test'],
    ['developer', 'Cron explainer', 'Read a cron expression in plain English.', 'cron,schedule'],
    ['developer', 'JWT decoder', 'Peek inside a token. Nothing is verified or sent.', 'jwt,decode,auth'],
    ['developer', 'UUID generator', 'Fresh v4 identifiers, as many as you need.', 'uuid,generate'],
    ['developer', 'Markdown preview', 'Write Markdown, see it rendered.', 'markdown,preview'],

    ['data', 'CSV to JSON', 'Turn a spreadsheet export into JSON.', 'csv,json,convert'],
    ['data', 'JSON to CSV', 'Flatten JSON records into rows.', 'csv,json,convert'],
    ['data', 'YAML to JSON', 'Convert between YAML and JSON.', 'yaml,json,convert'],
    ['data', 'Table sorter', 'Sort pasted rows by any column.', 'sort,table'],

    ['colour', 'Palette maker', 'Build a palette from a base colour.', 'palette,generate'],
    ['colour', 'Contrast checker', 'Test text and background against WCAG.', 'contrast,wcag,accessibility'],
    ['colour', 'Gradient picker', 'Design a CSS gradient and copy it.', 'gradient,css'],
    ['colour', 'Colour converter', 'HEX, RGB, HSL and OKLCH side by side.', 'hex,rgb,hsl,convert'],

    ['calculators', 'Percentage calculator', 'Percent of, percent change and the reverse.', 'percent,maths'],
    ['calculators', 'Tip splitter', 'Share a bill with a tip included.', 'tip,split,money'],
    ['calculators', 'Loan calculator', 'Monthly payment and total interest.', 'loan,interest,money'],
    ['calculators', 'BMI calculator', 'Body mass index from height and weight.', 'health,bmi'],

    ['converters', 'Unit converter', 'Length, weight, volume and more.', 'units,length,weight'],
    ['converters', 'Temperature converter', 'Celsius, Fahrenheit and Kelvin.', 'temperature,units'],
    ['converters', 'Number bases', 'Binary, octal, decimal and hex.', 'binary,hex,bases'],
    ['converters', 'Roman numerals', 'Convert to and from Roman numerals.', 'roman,numbers'],

    ['time', 'Timezone converter', 'Find the same moment across cities.', 'timezone,convert'],
    ['time', 'Date difference', 'Days between two dates.', 'dates,difference'],
    ['time', 'Countdown timer', 'Count down to an event.', 'countdown,timer'],
    ['time', 'Unix timestamp', 'Convert epoch seconds to dates and back.', 'unix,epoch,convert'],

    ['security', 'Password generator', 'Strong random passwords, made locally.', 'password,generate'],
    ['security', 'Hash generator', 'SHA-1, SHA-256 and SHA-512 of any text.', 'hash,sha,checksum'],
    ['security', 'Passphrase maker', 'Memorable multi-word passphrases.', 'passphrase,generate'],
    ['security', 'Password strength', 'Estimate how long a password would last.', 'password,check'],

    ['encoding', 'Base64', 'Encode and decode Base64 text.', 'base64,encode,decode'],
    ['encoding', 'URL encode & decode', 'Percent-encode text for safe links.', 'url,encode,decode'],
    ['encoding', 'HTML entities', 'Escape and unescape special characters.', 'html,escape'],
    ['encoding', 'Morse code', 'Translate text to dots and dashes.', 'morse,encode,decode'],

    ['math', 'Fractions', 'Add, subtract and simplify fractions.', 'fractions,simplify'],
    ['math', 'Prime checker', 'Is it prime? Factor it and see.', 'prime,factors'],
    ['math', 'Statistics', 'Mean, median, mode and spread.', 'mean,median,stats'],
    ['math', 'Number to words', 'Write numbers out in English.', 'numbers,words'],

    ['web', 'Meta tag builder', 'Title, description and social tags for a page.', 'seo,meta,html'],
    ['web', 'Slugify', 'Turn a title into a clean URL slug.', 'slug,url,seo'],
    ['web', 'UTM builder', 'Add campaign tags to a link.', 'utm,url,marketing'],
    ['web', 'Open Graph preview', 'See how a link will look when shared.', 'og,social,preview'],

    ['productivity', 'Pomodoro timer', 'Focus in 25-minute bursts.', 'timer,focus'],
    ['productivity', 'Checklist', 'A simple list that remembers itself.', 'list,todo'],
    ['productivity', 'Notepad', 'Quick notes saved in your browser.', 'notes,text'],
    ['productivity', 'Stopwatch', 'Start, stop and lap.', 'timer,laps'],

    ['fun', 'Dice roller', 'Roll one die or a handful.', 'dice,random'],
    ['fun', 'Coin flip', 'Heads or tails, settled.', 'coin,random'],
    ['fun', 'Random picker', 'Draw a winner from a list.', 'random,picker'],
    ['fun', 'Name shuffler', 'Shuffle names into teams.', 'teams,shuffle,random']
  ];

  var TOOLS = ROWS.map(function (r) {
    return {
      category: r[0],
      name: r[1],
      desc: r[2],
      tags: r[3].split(','),
      href: r[4] || null
    };
  });

  window.TOOLSHED = { categories: CATEGORIES, tools: TOOLS };
})();
