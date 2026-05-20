import re

path = 'ios/App/ShareExtension/Info.plist'
with open(path, 'r') as f:
    content = f.read()

# Replace NSExtensionMainStoryboard with NSExtensionPrincipalClass
old_storyboard = '<key>NSExtensionMainStoryboard</key>\n\t<string>MainInterface</string>'
new_principal = '<key>NSExtensionPrincipalClass</key>\n\t<string>ShareExtension.ShareViewController</string>'

if old_storyboard in content:
    content = content.replace(old_storyboard, new_principal)
    print('Replaced NSExtensionMainStoryboard with NSExtensionPrincipalClass')
else:
    print('WARNING: NSExtensionMainStoryboard not found - check manually')

# Remove LSApplicationQueriesSchemes block
content = re.sub(
    r'\s*<!-- iOS 18[^>]*-->\s*<key>LSApplicationQueriesSchemes</key>\s*<array>\s*<string>myrecipe</string>\s*</array>',
    '',
    content,
    flags=re.DOTALL
)
print('Removed LSApplicationQueriesSchemes block')

with open(path, 'w') as f:
    f.write(content)

print('Done - Info.plist updated')
print()
print('Verify the result:')
print(content)
