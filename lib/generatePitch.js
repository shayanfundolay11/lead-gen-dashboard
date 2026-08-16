export function generatePitchScript(lead) {
  const industry = lead.keyword_matched || 'business';
  const name = lead.business_name;

  const scripts = {
    'Website pitch': {
      en: `Hi, is this ${name}? I'm calling from a digital agency — I noticed ${name} doesn't have a website yet. These days most customers search online before visiting, so a simple, professional website could bring you a lot more walk-ins and calls. We build affordable websites specifically for ${industry.toLowerCase()} businesses. Would you be open to a quick chat about what that could look like for you?`,
      ur: `Assalam-o-Alaikum, ${name} se baat ho rahi hai? Main ek digital agency se call kar raha/rahi hoon — humne dekha ${name} ki abhi website nahi hai. Aajkal zyada tar customers online search karte hain kisi bhi jagah jaane se pehle, to ek simple si professional website aapke liye kaafi zyada customers la sakti hai. Hum ${industry} businesses ke liye affordable websites banate hain. Kya aap ke pass 2 minute hain isi baare mein baat karne ke liye?`,
    },
    'SEO / reach pitch': {
      en: `Hi, is this ${name}? I'm calling from a digital agency — we noticed ${name} has a website but isn't showing up much in local Google searches, which means potential customers may not be finding you easily. We help ${industry.toLowerCase()} businesses improve their search ranking so more people discover you online. Would it be alright if I shared a bit more about how that works?`,
      ur: `Assalam-o-Alaikum, ${name} se baat ho rahi hai? Main digital agency se baat kar raha/rahi hoon — humne dekha ${name} ki website to hai lekin Google search mein zyada nahi dikh rahi, jiski wajah se naye customers aap tak nahi pohanch pa rahe. Hum ${industry} businesses ki search ranking behtar karte hain taake zyada log aapko online dhoond saken. Kya main thora aur bata sakta/sakti hoon is baare mein?`,
    },
    'Social Media Marketing pitch': {
      en: `Hi, is this ${name}? I'm calling from a digital agency — ${name} already has a solid online presence, and we specialize in helping businesses like yours grow further through social media marketing to reach even more customers. Would you be interested in hearing how we could help boost your reach?`,
      ur: `Assalam-o-Alaikum, ${name} se baat ho rahi hai? Main digital agency se baat kar raha/rahi hoon — ${name} ki online presence to acchi hai, aur hum aap jaise businesses ki social media marketing ke through reach aur zyada barhane mein madad karte hain. Kya aap sunna chahenge ke hum kaise madad kar sakte hain?`,
    },
  };

  return scripts[lead.pitch_type] || {
    en: `Hi, is this ${name}? I'm calling from a digital agency to see if we could help with your online presence — do you have a couple of minutes?`,
    ur: `Assalam-o-Alaikum, ${name} se baat ho rahi hai? Main digital agency se baat kar raha/rahi hoon, kya aapke online presence mein madad kar sakte hain? Do minute hain baat karne ke liye?`,
  };
}
