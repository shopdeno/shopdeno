# Pinned Saleor image — matches local (3.23.x). Do NOT use :latest in prod.
# Deploys to Render free (Docker runtime, see ../render.yaml).
FROM ghcr.io/saleor/saleor:3.23

# HF Spaces runs as root by default; Saleor image has a saleor user.
# Keep root so start.sh can bind $PORT and write logs.
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]
