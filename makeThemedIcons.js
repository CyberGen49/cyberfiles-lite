
// This script generates the themed icons from icon-template.svg
// The template is read, and for each theme, the colors are replaced
// "rgb(255, 0, 0)" is replaced with the background color
// "rgb(255, 255, 255)" is replaced with the foreground color
// The new icons are saved to assets/icons/icon-<theme>.svg

const path = require('path');
const fs = require('fs');
const themes = require('./themes.json');

const themedIconsPath = path.join(__dirname, 'assets', 'icons');
if (fs.existsSync(themedIconsPath)) fs.rmSync(themedIconsPath, { recursive: true });
fs.mkdirSync(themedIconsPath);

const template = fs.readFileSync('./icon-template.svg', 'utf8');

for (const themeName in themes) {
    const theme = themes[themeName];
    const icon = template
        .replace(/rgb\(255, 0, 0\)/g, theme.bg)
        .replace(/rgb\(255, 255, 255\)/g, theme.fg);
    const newIconPath = path.join(themedIconsPath, `icon-${themeName}.svg`);
    fs.writeFileSync(newIconPath, icon);
    console.log(`Saved`, newIconPath);
}