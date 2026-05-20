import re

path = 'ios/App/ShareExtension/Info.plist'
with open(path, 'r') as f:
    content = f.read()

print('Before:')
print(content[content.find('NSExtension'):content.find('NSExtension')+500])
print('---')

# Replace using regex to handle any whitespace
content = re.sub(
    r'<key>NSExtensionMainStoryboard</key>\s*<string>MainInterface</string>',
    '<key>NSExtensionPrincipalClass</key>\n\t\t<string>ShareExtension.ShareViewController</string>',
    content
)

# Remove LSApplicationQueriesSchemes if still present
content = re.sub(
    r'<key>LSApplicationQueriesSchemes</key>.*?</array>',
    '',
    content,
    flags=re.DOTALL
)

# Remove the iOS 18 comment if still present
content = re.sub(
    r'\s*<!-- iOS 18[^>]*-->',
    '',
    content
)

with open(path, 'w') as f:
    f.write(content)

print('After:')
with open(path, 'r') as f:
    result = f.read()
print(result[result.find('NSExtension'):result.find('NSExtension')+300])
print('Done')
