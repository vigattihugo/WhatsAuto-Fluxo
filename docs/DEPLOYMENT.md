# 🚀 Deployment Guide

## Opção 1: Executar Localmente (Desenvolvimento)

### Pré-requisitos

- **Node.js** ≥ 18
- **npm** ou **yarn**

### Passos

```bash
# 1. Clone
git clone https://github.com/seu-usuario/whatsauto.git
cd whatsauto

# 2. Instale dependências
npm install

# 3. Development server
npm run dev

# Abra http://localhost:5173
```

---

## Opção 2: Build & Preview

```bash
# Build para produção
npm run build

# Preview do build
npm run preview

# Abra http://localhost:4173
```

---

## Opção 3: Deploy Estático (Recomendado)

Como o projeto usa `vite-plugin-singlefile`, a build gera um **HTML único** auto-contido.

### A. GitHub Pages

```bash
# 1. Atualize o nome do repo em vite.config.ts:
# base: '/whatsauto/', (se for usuario.github.io/whatsauto)
# Ou deixe vazio se for usuario.github.io

# 2. Build
npm run build

# 3. Commit para branch gh-pages (ou configure in Settings)
git add dist/
git commit -m "Deploy"
git push origin dist:gh-pages

# Seu site está em: https://seu-usuario.github.io/whatsauto
```

### B. Netlify

```bash
# 1. Crie conta em https://netlify.com

# 2. Connect seu repo

# 3. Build settings:
# Build command: npm run build
# Publish directory: dist

# Pronto! Seu site está em netlify.com
```

### C. Vercel

```bash
# 1. Instale Vercel CLI
npm install -g vercel

# 2. Deploy
vercel

# Segue prompts...
# Seu site está em: seu-projeto.vercel.app
```

### D. AWS S3 + CloudFront

```bash
# 1. Build
npm run build

# 2. Upload para S3
aws s3 sync dist/ s3://seu-bucket/

# 3. Invalidate CloudFront (se aplicável)
aws cloudfront create-invalidation --distribution-id XXXX --paths "/*"
```

### E. DigitalOcean App Platform

```bash
# 1. Crie aplicação em https://cloud.digitalocean.com

# 2. Escolha "Static Site"

# 3. Build settings:
# Build command: npm run build
# Output directory: dist

# Deploy automático a cada push!
```

---

## Opção 4: Docker

### Build Local

```bash
# Build imagem
docker build -t whatsauto:latest .

# Run container
docker run -p 3000:80 whatsauto:latest

# Acesse http://localhost:3000
```

### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Push para Docker Hub

```bash
docker tag whatsauto:latest seu-usuario/whatsauto:latest
docker push seu-usuario/whatsauto:latest
```

---

## Opção 5: Kubernetes

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whatsauto
spec:
  replicas: 2
  selector:
    matchLabels:
      app: whatsauto
  template:
    metadata:
      labels:
        app: whatsauto
    spec:
      containers:
      - name: whatsauto
        image: seu-usuario/whatsauto:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: whatsauto-service
spec:
  selector:
    app: whatsauto
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

### Deploy

```bash
kubectl apply -f deployment.yaml

# Check status
kubectl get deployment whatsauto
kubectl get svc whatsauto-service
```

---

## ✅ Checklist de Deploy

- [ ] Build roda sem erros (`npm run build`)
- [ ] TypeScript sem erros (`tsc --noEmit`)
- [ ] Variáveis de ambiente configuradas (se necessário)
- [ ] CORS configurado (se necessário)
- [ ] Cache headers otimizados
- [ ] Minification ativado
- [ ] Source maps desativados em produção
- [ ] Testado em navegador

---

## 🔒 Segurança

- Use HTTPS (todos os deploys modernos suportam)
- Configure CSP headers se necessário
- Revise dados sensíveis antes de deploy

---

## 📊 Monitoramento

### Vercel

- Visite https://vercel.com/dashboard
- Real-time analytics, performance, logs

### Netlify

- Visite https://netlify.com
- Usage, analytics, deploys

### Custom (VPS)

- Instale **PM2** para monitorar processo
- Configure **Prometheus** + **Grafana** para métricas
- Use **ELK Stack** para logs

---

## 🚨 Troubleshooting

### Build falha

```bash
# Limpar cache
rm -rf node_modules dist
npm install
npm run build
```

### Blank page em produção

- Cheque console do navegador (F12 → Console)
- Verifique que paths estão corretos
- Se usar sub-paths, configure `base` em `vite.config.ts`

### Lento em produção

- Rode `npm run build` e verifique tamanho dos arquivos
- Use `npm run preview` para testar localmente
- Ative gzip no servidor

---

## 🤔 Qual opção escolher?

| Opção | Custo | Setup | Escalabilidade | Recomendação |
|-------|-------|-------|-----------------|--------------|
| GitHub Pages | Grátis | ⭐ | Baixa | Projetos pequenos |
| Netlify | Grátis | ⭐ | Média | Melhor grátis |
| Vercel | Grátis | ⭐⭐ | Média | Ótima DX |
| AWS S3 | ~$1/mês | ⭐⭐ | Alta | Escalável |
| Docker | ~$5/mês | ⭐⭐⭐ | Muito alta | Microserviços |
| Kubernetes | ~$20/mês | ⭐⭐⭐⭐ | Ultra alta | Enterprise |

**Recomendação para começar: Vercel ou Netlify** (ambos grátis, ótima DX, deploy automático)

---

Para dúvidas, abra uma [Issue](https://github.com/seu-usuario/whatsauto/issues)!
