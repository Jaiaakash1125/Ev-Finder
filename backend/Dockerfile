FROM php:8.2-apache

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
RUN docker-php-ext-install pdo pdo_mysql && a2enmod rewrite

# Configure Apache
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Copy API files
COPY api/ /var/www/html/api/v1/
COPY api/ /var/www/html/

EXPOSE 80

CMD ["apache2-foreground"]
