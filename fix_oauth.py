path = 'app/login/page.js'
with open(path, 'r') as f:
    content = f.read()

old = """    const cb = new URL(result.url)
    // Most providers return ?code=... in the query string. Hash fallback
    // covers the few that put it in the fragment (#code=...).
    let code = cb.searchParams.get('code')
    if (!code && cb.hash) {
      const hash = cb.hash.startsWith('#') ? cb.hash.slice(1) : cb.hash
      code = new URLSearchParams(hash).get('code')
    }
    if (!code) throw new Error('No auth code in callback URL')

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) throw new Error(exchangeError.message)"""

new = """    const cb = new URL(result.url)
    const hash = cb.hash.startsWith('#') ? cb.hash.slice(1) : cb.hash
    const hashParams = new URLSearchParams(hash)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const code = cb.searchParams.get('code')

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (sessionError) throw new Error(sessionError.message)
    } else if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) throw new Error(exchangeError.message)
    } else {
      throw new Error('No auth token or code in callback URL')
    }"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('Done')
else:
    print('Pattern not found')
    # Show what is in the file around that area
    for i, line in enumerate(content.split('\n')):
        if 'exchangeCodeForSession' in line or 'auth code' in line:
            print(i, repr(line))
