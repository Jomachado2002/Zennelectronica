// Build optimization script
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BuildOptimizer {
  constructor() {
    this.buildDir = path.join(__dirname, 'build');
    this.optimizations = [];
  }

  // Run all optimizations
  async optimize() {
    console.log('🚀 Starting build optimization...');
    
    try {
      await this.optimizeHTML();
      await this.optimizeCSS();
      await this.optimizeJS();
      await this.optimizeImages();
      await this.optimizeAssets();
      await this.generateManifest();
      await this.generateSitemap();
      
      console.log('✅ Build optimization completed successfully!');
      console.log(`📊 Optimizations applied: ${this.optimizations.length}`);
    } catch (error) {
      console.error('❌ Build optimization failed:', error);
      throw error;
    }
  }

  // Optimize HTML files
  async optimizeHTML() {
    console.log('📄 Optimizing HTML files...');
    
    const htmlFiles = this.findFiles('*.html');
    
    for (const file of htmlFiles) {
      let content = fs.readFileSync(file, 'utf8');
      
      // Remove comments
      content = content.replace(/<!--[\s\S]*?-->/g, '');
      
      // Minify whitespace
      content = content.replace(/\s+/g, ' ').trim();
      
      // Add performance hints
      content = content.replace(
        '<head>',
        `<head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#000000">
        <link rel="preload" href="/static/css/main.css" as="style">
        <link rel="preload" href="/static/js/main.js" as="script">`
      );
      
      fs.writeFileSync(file, content);
      this.optimizations.push('HTML minification');
    }
  }

  // Optimize CSS files
  async optimizeCSS() {
    console.log('🎨 Optimizing CSS files...');
    
    const cssFiles = this.findFiles('*.css');
    
    for (const file of cssFiles) {
      let content = fs.readFileSync(file, 'utf8');
      
      // Remove comments
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Minify whitespace
      content = content.replace(/\s+/g, ' ').trim();
      
      // Remove unnecessary semicolons
      content = content.replace(/;}/g, '}');
      
      fs.writeFileSync(file, content);
      this.optimizations.push('CSS minification');
    }
  }

  // Optimize JavaScript files
  async optimizeJS() {
    console.log('⚡ Optimizing JavaScript files...');
    
    const jsFiles = this.findFiles('*.js');
    
    for (const file of jsFiles) {
      let content = fs.readFileSync(file, 'utf8');
      
      // Remove console.log statements in production
      if (process.env.NODE_ENV === 'production') {
        content = content.replace(/console\.log\([^)]*\);?/g, '');
        content = content.replace(/console\.warn\([^)]*\);?/g, '');
        content = content.replace(/console\.error\([^)]*\);?/g, '');
      }
      
      fs.writeFileSync(file, content);
      this.optimizations.push('JavaScript optimization');
    }
  }

  // Optimize images
  async optimizeImages() {
    console.log('🖼️ Optimizing images...');
    
    const imageFiles = this.findFiles('*.{png,jpg,jpeg,gif,svg}');
    
    for (const file of imageFiles) {
      try {
        // Use imagemin for image optimization
        const imagemin = require('imagemin');
        const imageminPngquant = require('imagemin-pngquant');
        const imageminMozjpeg = require('imagemin-mozjpeg');
        
        const optimized = await imagemin([file], {
          destination: path.dirname(file),
          plugins: [
            imageminMozjpeg({ quality: 80 }),
            imageminPngquant({ quality: [0.6, 0.8] })
          ]
        });
        
        if (optimized.length > 0) {
          this.optimizations.push('Image optimization');
        }
      } catch (error) {
        console.warn(`⚠️ Could not optimize image: ${file}`);
      }
    }
  }

  // Optimize assets
  async optimizeAssets() {
    console.log('📦 Optimizing assets...');
    
    // Generate gzip files
    const files = this.findFiles('*.{css,js,html,json}');
    
    for (const file of files) {
      try {
        const zlib = require('zlib');
        const gzip = zlib.createGzip();
        const input = fs.createReadStream(file);
        const output = fs.createWriteStream(`${file}.gz`);
        
        input.pipe(gzip).pipe(output);
        this.optimizations.push('Gzip compression');
      } catch (error) {
        console.warn(`⚠️ Could not compress file: ${file}`);
      }
    }
  }

  // Generate manifest
  async generateManifest() {
    console.log('📋 Generating manifest...');
    
    const manifest = {
      name: 'Zenn Electrónica',
      short_name: 'Zenn',
      description: 'Sistema de gestión empresarial - Zenn Electrónica',
      start_url: '/',
      display: 'standalone',
      theme_color: '#000000',
      background_color: '#ffffff',
      icons: [
        {
          src: '/favicon.ico',
          sizes: '16x16',
          type: 'image/x-icon'
        }
      ]
    };
    
    fs.writeFileSync(
      path.join(this.buildDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    this.optimizations.push('Manifest generation');
  }

  // Generate sitemap
  async generateSitemap() {
    console.log('🗺️ Generating sitemap...');
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://zennelectronica02.vercel.app/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    
    fs.writeFileSync(
      path.join(this.buildDir, 'sitemap.xml'),
      sitemap
    );
    
    this.optimizations.push('Sitemap generation');
  }

  // Find files by pattern
  findFiles(pattern) {
    const files = [];
    const glob = require('glob');
    
    try {
      const matches = glob.sync(pattern, { cwd: this.buildDir });
      files.push(...matches.map(match => path.join(this.buildDir, match)));
    } catch (error) {
      console.warn(`⚠️ Could not find files matching pattern: ${pattern}`);
    }
    
    return files;
  }

  // Generate optimization report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      optimizations: this.optimizations,
      buildSize: this.getBuildSize(),
      fileCount: this.getFileCount(),
    };
    
    fs.writeFileSync(
      path.join(this.buildDir, 'optimization-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('📊 Optimization report generated');
  }

  // Get build size
  getBuildSize() {
    const size = require('get-folder-size');
    return size.sync(this.buildDir);
  }

  // Get file count
  getFileCount() {
    const glob = require('glob');
    const files = glob.sync('**/*', { cwd: this.buildDir });
    return files.length;
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new BuildOptimizer();
  optimizer.optimize()
    .then(() => optimizer.generateReport())
    .catch(console.error);
}

module.exports = BuildOptimizer;
