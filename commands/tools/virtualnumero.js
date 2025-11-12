const axios = require('axios');
const cheerio = require('cheerio');

if (!global.numVirtualData) {
  global.numVirtualData = new Map();
}

module.exports = {
  command: ["numvirtual", "sms", "getnum", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  description: "Números virtuales dinámicos",
  category: "Utilidades",
  
  async run(client, m, args) {
    try {
      const sender = m.sender;
      const comandoUsado = m.command;
      
      if (/^[1-9]$|^10$/.test(comandoUsado)) {
        const seleccion = parseInt(comandoUsado);
        return await this.verSMSReal(client, m, seleccion);
      }
      
      await this.buscarNumerosDinamicos(client, m);
      
    } catch (err) {
      console.error('❌ ERROR:', err);
      m.reply(`❌ Error: ${err.message}`);
    }
  },
  
  // Headers realistas para evitar bloqueos
  getHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    };
  },
  
  async buscarNumerosDinamicos(client, m) {
    const sender = m.sender;
    
    await m.reply('🔍 Buscando números en múltiples sitios...\n⏱️ Espera 10-15 segundos...');
    
    let todosLosNumeros = [];
    let sitiosExitosos = 0;
    
    // FUENTE 1: receive-smss.com
    try {
      const nums1 = await this.scrapearReceiveSMSS();
      if (nums1.length > 0) {
        todosLosNumeros.push(...nums1);
        sitiosExitosos++;
        console.log(`✅ receive-smss.com: ${nums1.length} números`);
      }
    } catch (e) {
      console.log('❌ receive-smss.com:', e.message);
    }
    
    // FUENTE 2: receivesmsonline.net
    try {
      const nums2 = await this.scrapearReceiveSMSOnline();
      if (nums2.length > 0) {
        todosLosNumeros.push(...nums2);
        sitiosExitosos++;
        console.log(`✅ receivesmsonline.net: ${nums2.length} números`);
      }
    } catch (e) {
      console.log('❌ receivesmsonline.net:', e.message);
    }
    
    // FUENTE 3: sms24.me
    try {
      const nums3 = await this.scrapearSMS24();
      if (nums3.length > 0) {
        todosLosNumeros.push(...nums3);
        sitiosExitosos++;
        console.log(`✅ sms24.me: ${nums3.length} números`);
      }
    } catch (e) {
      console.log('❌ sms24.me:', e.message);
    }
    
    // FUENTE 4: temp-number.com
    try {
      const nums4 = await this.scrapearTempNumber();
      if (nums4.length > 0) {
        todosLosNumeros.push(...nums4);
        sitiosExitosos++;
        console.log(`✅ temp-number.com: ${nums4.length} números`);
      }
    } catch (e) {
      console.log('❌ temp-number.com:', e.message);
    }
    
    if (todosLosNumeros.length === 0) {
      return m.reply(`❌ No se pudieron obtener números (${sitiosExitosos}/4 sitios funcionaron)\n\n⚠️ Los sitios pueden estar bloqueados o caídos.\n\n💡 Intenta de nuevo en unos minutos.`);
    }
    
    const numerosUnicos = this.eliminarDuplicados(todosLosNumeros).slice(0, 10);
    
    global.numVirtualData.set(sender, {
      numeros: numerosUnicos,
      timestamp: Date.now()
    });
    
    setTimeout(() => {
      global.numVirtualData.delete(sender);
    }, 300000);
    
    let mensaje = `📱 *${numerosUnicos.length} NÚMEROS ENCONTRADOS*\n\n`;
    mensaje += `✅ ${sitiosExitosos}/4 sitios activos\n\n`;
    
    numerosUnicos.forEach((num, i) => {
      const formatted = this.formatearNumero(num.numero);
      mensaje += `*${i+1}.* ${num.emoji} ${formatted}\n   📍 ${num.pais}\n\n`;
    });
    
    mensaje += `━━━━━━━━━━━━━━━━━━\n\n`;
    mensaje += `💡 Escribe \`.1\` hasta \`.${numerosUnicos.length}\``;
    
    await m.reply(mensaje);
  },
  
  // SCRAPER 1: receive-smss.com
  async scrapearReceiveSMSS() {
    const response = await axios.get('https://receive-smss.com', {
      headers: this.getHeaders(),
      timeout: 10000,
      validateStatus: (status) => status < 500
    });
    
    if (response.status === 403) {
      throw new Error('Bloqueado por Cloudflare');
    }
    
    const $ = cheerio.load(response.data);
    const numeros = [];
    
    $('a[href*="/sms/"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const texto = $(elem).text();
      const numeroMatch = texto.match(/\+?\d{10,15}/);
      
      if (numeroMatch && href) {
        const numero = numeroMatch[0];
        const paisData = this.detectarPais(numero);
        
        numeros.push({
          numero: numero,
          emoji: paisData.emoji,
          pais: paisData.nombre,
          url: `https://receive-smss.com${href}`,
          sitio: 'receive-smss.com'
        });
      }
    });
    
    return numeros;
  },
  
  // SCRAPER 2: receivesmsonline.net (alternativa)
  async scrapearReceiveSMSOnline() {
    const response = await axios.get('https://receivesmsonline.net', {
      headers: this.getHeaders(),
      timeout: 10000,
      validateStatus: (status) => status < 500
    });
    
    const $ = cheerio.load(response.data);
    const numeros = [];
    
    $('.number-boxes a, .number-list a, a[href*="number"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const texto = $(elem).text();
      const numeroMatch = texto.match(/\+?\d{10,15}/);
      
      if (numeroMatch && href) {
        const numero = numeroMatch[0];
        const paisData = this.detectarPais(numero);
        
        numeros.push({
          numero: numero,
          emoji: paisData.emoji,
          pais: paisData.nombre,
          url: href.startsWith('http') ? href : `https://receivesmsonline.net${href}`,
          sitio: 'receivesmsonline.net'
        });
      }
    });
    
    return numeros;
  },
  
  // SCRAPER 3: sms24.me
  async scrapearSMS24() {
    const response = await axios.get('https://www.sms24.me/en/', {
      headers: this.getHeaders(),
      timeout: 10000,
      validateStatus: (status) => status < 500
    });
    
    const $ = cheerio.load(response.data);
    const numeros = [];
    
    $('a, .number, h3, h4').each((i, elem) => {
      const texto = $(elem).text();
      const numeroMatch = texto.match(/\+?\d{10,15}/);
      
      if (numeroMatch) {
        const numero = numeroMatch[0];
        const paisData = this.detectarPais(numero);
        
        numeros.push({
          numero: numero,
          emoji: paisData.emoji,
          pais: paisData.nombre,
          url: 'https://www.sms24.me/en/',
          sitio: 'sms24.me'
        });
      }
    });
    
    return numeros;
  },
  
  // SCRAPER 4: temp-number.com
  async scrapearTempNumber() {
    const response = await axios.get('https://temp-number.com', {
      headers: this.getHeaders(),
      timeout: 10000,
      validateStatus: (status) => status < 500
    });
    
    const $ = cheerio.load(response.data);
    const numeros = [];
    
    $('a, .phone-number, .number').each((i, elem) => {
      const texto = $(elem).text();
      const numeroMatch = texto.match(/\+?\d{10,15}/);
      
      if (numeroMatch) {
        const numero = numeroMatch[0];
        const paisData = this.detectarPais(numero);
        
        numeros.push({
          numero: numero,
          emoji: paisData.emoji,
          pais: paisData.nombre,
          url: 'https://temp-number.com',
          sitio: 'temp-number.com'
        });
      }
    });
    
    return numeros;
  },
  
  async verSMSReal(client, m, seleccion) {
    const sender = m.sender;
    const userData = global.numVirtualData.get(sender);
    
    if (!userData) {
      return m.reply(`⚠️ Usa primero: ${m.prefix}numvirtual`);
    }
    
    const numeroSeleccionado = userData.numeros[seleccion - 1];
    
    if (!numeroSeleccionado) {
      return m.reply('❌ Número inválido');
    }
    
    const formatted = this.formatearNumero(numeroSeleccionado.numero);
    
    await m.reply(`📱 *NÚMERO ${seleccion}*\n\n${numeroSeleccionado.emoji} ${formatted}\n🌐 ${numeroSeleccionado.sitio}\n\n🔍 Obteniendo SMS...`);
    
    try {
      const response = await axios.get(numeroSeleccionado.url, {
        headers: this.getHeaders(),
        timeout: 15000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 403) {
        throw new Error('Bloqueado - intenta otro número');
      }
      
      const $ = cheerio.load(response.data);
      const mensajes = [];
      
      $('.list-group-item, .message, .sms, tr, .inbox-item, .msg').each((i, elem) => {
        if (mensajes.length >= 5) return false;
        
        const $elem = $(elem);
        const textoCompleto = $elem.text().trim();
        
        if (textoCompleto.length < 20 || textoCompleto.length > 1000) return;
        
        const remitente = $elem.find('strong, .from, .sender, td').first().text().trim() ||
                         textoCompleto.split('\n')[0]?.substring(0, 30) ||
                         'Unknown';
        
        const mensaje = $elem.find('p, .text, .body, .message-text').text().trim() ||
                       textoCompleto;
        
        const fecha = $elem.find('small, .time, .date, .ago').text().trim() ||
                     'Reciente';
        
        if (mensaje && mensaje.length > 15) {
          mensajes.push({
            de: remitente.substring(0, 50),
            texto: mensaje.substring(0, 300),
            fecha: fecha.substring(0, 30)
          });
        }
      });
      
      if (mensajes.length === 0) {
        return m.reply(`📭 *Sin SMS*\n\n📱 ${formatted}\n\n💡 Usa el número y escribe \`.${seleccion}\` en 30 seg\n\n🔗 ${numeroSeleccionado.url}`);
      }
      
      let respuesta = `📨 *${mensajes.length} SMS*\n\n`;
      respuesta += `📱 ${numeroSeleccionado.emoji} ${formatted}\n`;
      respuesta += `━━━━━━━━━━━━━━━━━━\n\n`;
      
      mensajes.forEach((msg, i) => {
        respuesta += `📩 *${i+1}*\n`;
        respuesta += `👤 ${msg.de}\n`;
        respuesta += `💬 ${msg.texto}\n`;
        
        const codigos = msg.texto.match(/\b\d{4,8}\b/g);
        if (codigos) {
          respuesta += `\n🔢 ${[...new Set(codigos)].map(c => `\`${c}\``).join(' ')}\n`;
        }
        
        respuesta += `⏰ ${msg.fecha}\n\n`;
      });
      
      respuesta += `🔄 \`.${seleccion}\` para actualizar`;
      
      await m.reply(respuesta);
      
      await client.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      });
      
    } catch (err) {
      console.error('Error SMS:', err);
      m.reply(`❌ ${err.message}\n\n🔗 Visita: ${numeroSeleccionado.url}`);
    }
  },
  
  detectarPais(numero) {
    const paises = {
      '+1': { emoji: '🇺🇸', nombre: 'USA' },
      '+44': { emoji: '🇬🇧', nombre: 'UK' },
      '+52': { emoji: '🇲🇽', nombre: 'México' },
      '+51': { emoji: '🇵🇪', nombre: 'Perú' },
      '+91': { emoji: '🇮🇳', nombre: 'India' },
      '+62': { emoji: '🇮🇩', nombre: 'Indonesia' },
      '+55': { emoji: '🇧🇷', nombre: 'Brasil' },
      '+63': { emoji: '🇵🇭', nombre: 'Filipinas' },
      '+358': { emoji: '🇫🇮', nombre: 'Finlandia' },
      '+7': { emoji: '🇷🇺', nombre: 'Rusia' }
    };
    
    for (const [codigo, data] of Object.entries(paises)) {
      if (numero.startsWith(codigo)) return data;
    }
    
    return { emoji: '🌍', nombre: 'Internacional' };
  },
  
  eliminarDuplicados(numeros) {
    const unicos = [];
    const vistos = new Set();
    
    for (const num of numeros) {
      if (!vistos.has(num.numero)) {
        vistos.add(num.numero);
        unicos.push(num);
      }
    }
    
    return unicos;
  },
  
  formatearNumero(num) {
    if (num.startsWith('+1') && num.length === 12) {
      return `+1 (${num.slice(2,5)}) ${num.slice(5,8)}-${num.slice(8)}`;
    }
    return num;
  }
};
