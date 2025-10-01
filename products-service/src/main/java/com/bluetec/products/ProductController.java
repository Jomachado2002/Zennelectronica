package com.zenn.products;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "https://zenn.vercel.app"})
public class ProductController {

    @Autowired
    private MongoTemplate mongoTemplate;

    @GetMapping("/api/obtener-productos-home")
    public Map<String, Object> getHomeProducts() {
        try {
            // Criterio: productos con stock
            Criteria stockCriteria = new Criteria().orOperator(
                Criteria.where("stock").exists(false),
                Criteria.where("stock").is(null),
                Criteria.where("stock").gt(0)
            );

            // Agregación optimizada
            Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(stockCriteria),
                Aggregation.project("productName", "category", "subcategory", "price", "sellingPrice", "slug")
                    .and(ArrayOperators.Slice.sliceArrayOf("productImage").itemCount(2)).as("productImage"),
                Aggregation.facet()
                    .and(Aggregation.match(Criteria.where("category").is("informatica").and("subcategory").is("notebooks")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(20)).as("notebooks")
                    .and(Aggregation.match(Criteria.where("category").is("informatica").and("subcategory").is("placas_madre")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(20)).as("placas_madre")
                    .and(Aggregation.match(Criteria.where("category").is("perifericos").and("subcategory").is("monitores")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(20)).as("monitores")
                    .and(Aggregation.match(Criteria.where("category").is("informatica").and("subcategory").is("memorias_ram")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(20)).as("memorias_ram")
                    .and(Aggregation.match(Criteria.where("category").is("informatica").and("subcategory").is("discos_duros")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(20)).as("discos_duros")
                    .and(Aggregation.match(Criteria.where("category").is("informatica").and("subcategory").is("tarjeta_grafica")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(20)).as("tarjeta_grafica")
                    .and(Aggregation.match(Criteria.where("category").is("informatica").and("subcategory").is("gabinetes")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(20)).as("gabinetes")
                    .and(Aggregation.match(Criteria.where("category").is("informatica").and("subcategory").is("procesador")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(20)).as("procesador")
                    .and(Aggregation.match(Criteria.where("category").is("perifericos").and("subcategory").is("mouses")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(12)).as("mouses")
                    .and(Aggregation.match(Criteria.where("category").is("perifericos").and("subcategory").is("teclados")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(12)).as("teclados")
                    .and(Aggregation.match(Criteria.where("category").is("telefonia").and("subcategory").is("telefonos_moviles")),
                         Aggregation.sort(Sort.by(Sort.Direction.DESC, "_id")),
                         Aggregation.limit(20)).as("telefonos_moviles")
            );

            List<Map> results = mongoTemplate.aggregate(aggregation, "products", Map.class).getMappedResults();
            Map<String, Object> result = results.get(0);

            // Organizar respuesta
            Map<String, Object> organizedData = new HashMap<>();
            Map<String, Object> informatica = new HashMap<>();
            Map<String, Object> perifericos = new HashMap<>();
            Map<String, Object> telefonia = new HashMap<>();

            informatica.put("notebooks", result.get("notebooks"));
            informatica.put("placas_madre", result.get("placas_madre"));
            informatica.put("memorias_ram", result.get("memorias_ram"));
            informatica.put("discos_duros", result.get("discos_duros"));
            informatica.put("tarjeta_grafica", result.get("tarjeta_grafica"));
            informatica.put("gabinetes", result.get("gabinetes"));
            informatica.put("procesador", result.get("procesador"));

            perifericos.put("monitores", result.get("monitores"));
            perifericos.put("mouses", result.get("mouses"));
            perifericos.put("teclados", result.get("teclados"));

            telefonia.put("telefonos_moviles", result.get("telefonos_moviles"));

            organizedData.put("informatica", informatica);
            organizedData.put("perifericos", perifericos);
            organizedData.put("telefonia", telefonia);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Productos para home obtenidos");
            response.put("data", organizedData);
            
            return response;

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error: " + e.getMessage());
            return errorResponse;
        }
    }
}