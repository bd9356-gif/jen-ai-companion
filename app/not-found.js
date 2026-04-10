export default function NotFound() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
      <p style={{fontSize:'3rem'}}>🍽️</p>
      <h1 style={{fontSize:'1.5rem',fontWeight:'bold',color:'#111'}}>Page not found</h1>
      <a href="/kitchen" style={{marginTop:'1rem',color:'#ea580c'}}>← Back to Kitchen</a>
    </div>
  )
}
