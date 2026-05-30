export default function MarketingLanding() {
  return (
    <div style={{margin:0,padding:0,width:'100%',minHeight:'100vh',background:'#000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end'}}>
      <img
        src="/landing-hero-10.png"
        alt="MyRecipe Companion"
        style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center',zIndex:0,pointerEvents:'none'}}
      />
      <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:'400px',padding:'0 24px 60px 24px',display:'flex',flexDirection:'column',gap:'12px'}}>
        <a href="https://recipe.mycompanionapps.com/login" style={{display:'block',width:'100%',padding:'16px',background:'#ea580c',color:'white',textAlign:'center',fontSize:'18px',fontWeight:'700',borderRadius:'16px',textDecoration:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.4)'}}>
          Get Started — It&apos;s Free
        </a>
        <a href="https://recipe.mycompanionapps.com/login" style={{display:'block',width:'100%',padding:'14px',background:'rgba(255,255,255,0.15)',color:'white',textAlign:'center',fontSize:'16px',fontWeight:'600',borderRadius:'16px',textDecoration:'none',border:'1px solid rgba(255,255,255,0.3)',backdropFilter:'blur(8px)'}}>
          Sign In
        </a>
        <p style={{textAlign:'center',color:'rgba(255,255,255,0.4)',fontSize:'11px',marginTop:'4px'}}>
          <a href="https://recipe.mycompanionapps.com/privacy" style={{color:'rgba(255,255,255,0.4)',textDecoration:'none'}}>Privacy</a>
          <span style={{margin:'0 8px'}}>·</span>
          <a href="https://recipe.mycompanionapps.com/terms" style={{color:'rgba(255,255,255,0.4)',textDecoration:'none'}}>Terms</a>
        </p>
      </div>
    </div>
  )
}
