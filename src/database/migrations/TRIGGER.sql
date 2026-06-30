INSERT INTO wallets (id, "tenantId", "userId", type, balance, status, "createdAt", "updatedAt")
VALUES (gen_random_uuid(),NULL,NULL,'PLATFORM_BANK',0,'ACTIVE',NOW(),NOW());
########################3
INSERT INTO "user_roles" ("roleId", "userId")
VALUES ('acbaa65e-ae78-425d-830a-8b995c9d46d0', '1506ad05-819a-46e9-8690-a41bcc7768e6');
#################

UPDATE roles
SET "isSystem" = true
WHERE name IN ('OWNER', 'ADMIN', 'STAFF', 'SUPER_ADMIN');

######################
INSERT INTO discounts ("id","code", "type", "value", "description","minPurchase", "maxDiscountAmount", "usageLimit",
    "usedCount","expireDate",  "isActive",  "userId",  "createdAt"
) VALUES (
    gen_random_uuid(),
    'TEST20', 'percent', 20, '20 percent discount for orders above 500000', 500000, 100000,
    100,  0,  '2026-12-31 23:59:59',  true,  NULL,  NOW()
);


#############
CREATE
OR REPLACE FUNCTION recalculate_product_stats()
RETURNS TRIGGER AS $$
DECLARE
target_product_id UUID;
    target_tenant_id
UUID;
BEGIN
    IF
(TG_OP = 'DELETE') THEN
        target_product_id := OLD."productId";
        target_tenant_id
:= OLD."tenantId";
ELSE
        target_product_id := NEW."productId";
        target_tenant_id
:= NEW."tenantId";
END IF;

UPDATE "market_products"
SET "reviews_count"  = (SELECT COUNT(*)
                        FROM "product_reviews"
                        WHERE "product_reviews"."productId" = target_product_id
                          AND "product_reviews"."tenantId" = target_tenant_id
                          AND "product_reviews"."isApproved" = true),
    "average_rating" = (SELECT COALESCE(AVG(rating), 0)
                        FROM "product_reviews"
                        WHERE "product_reviews"."productId" = target_product_id
                          AND "product_reviews"."tenantId" = target_tenant_id
                          AND "product_reviews"."isApproved" = true)
WHERE "market_products"."id" = target_product_id
  AND "market_products"."tenantId" = target_tenant_id;

IF
(TG_OP = 'DELETE') THEN RETURN OLD;
ELSE RETURN NEW;
END IF;
END;
$$
LANGUAGE plpgsql;

#######################
Trigger for tenant set reviewsCount and rating when insert or update tenantReview

CREATE
OR REPLACE FUNCTION recalculate_tenant_stats()
RETURNS TRIGGER AS $$
DECLARE
target_tenant_id UUID;
BEGIN
    IF
(TG_OP = 'DELETE') THEN
        target_tenant_id := OLD."tenantId";
ELSE
        target_tenant_id := NEW."tenantId";
END IF;

UPDATE "tenants"
SET "reviewsCount" = (SELECT COUNT(*)
                      FROM "tenant_reviews"
                      WHERE "tenant_reviews"."tenantId" = target_tenant_id
                        AND "tenant_reviews"."isApproved" = true),
    "rating"       = (SELECT COALESCE(AVG(rating), 0)
                      FROM "tenant_reviews"
                      WHERE "tenant_reviews"."tenantId" = target_tenant_id
                        AND "tenant_reviews"."isApproved" = true)
WHERE "tenants"."id" = target_tenant_id;

IF
(TG_OP = 'DELETE') THEN
        RETURN OLD;
ELSE
        RETURN NEW;
END IF;
END;
$$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenant_stats_update ON "tenant_reviews";

CREATE TRIGGER trigger_tenant_stats_update
    AFTER INSERT OR
UPDATE OR
DELETE
ON "tenant_reviews"
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_tenant_stats();

############################### shop_review
CREATE
OR REPLACE FUNCTION update_tenant_rating_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
UPDATE tenants
SET "rating"       = (SELECT COALESCE(AVG("rating"), 0)
                    FROM "shop_reviews"
                    WHERE "tenantId" = NEW."tenantId"),
    "reviewsCount" = (SELECT COUNT(*)
                    FROM shop_reviews
                    WHERE "tenantId" = NEW."tenantId"),
    "updatedAt"    = NOW()
WHERE id = NEW."tenantId";
RETURN NEW;
END;
$$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_shop_review_change ON shop_reviews;

CREATE TRIGGER on_shop_review_change
    AFTER INSERT OR
UPDATE ON shop_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_rating_trigger_function();


#############################
ALTER TABLE "market_products"
    ADD COLUMN IF NOT EXISTS "reviews_count" INT DEFAULT 0;
ALTER TABLE "market_products"
    ADD COLUMN IF NOT EXISTS "average_rating" DECIMAL (3, 2) DEFAULT 0;

############################
CREATE TRIGGER update_product_stats_on_review_change
    AFTER INSERT OR
UPDATE OR
DELETE
ON "product_reviews"
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_product_stats();

##############################
CREATE
OR REPLACE FUNCTION recalculate_product_stats() RETURNS TRIGGER AS $$
DECLARE
target_product_id UUID;
    target_tenant_id
UUID;
BEGIN
    IF
(TG_OP = 'DELETE') THEN
        target_product_id := OLD."productId";
        target_tenant_id
:= OLD."tenantId";
ELSE
        target_product_id := NEW."productId";
        target_tenant_id
:= NEW."tenantId";
END IF;

UPDATE "market_products"
SET "reviews_count"  = (SELECT COUNT(*)
                        FROM "product_reviews"
                        WHERE "product_reviews"."productId" = target_product_id
                          AND "product_reviews"."tenantId" = target_tenant_id
                          AND "product_reviews"."isApproved" = true),
    "average_rating" = (SELECT COALESCE(AVG(rating), 0)
                        FROM "product_reviews"
                        WHERE "product_reviews"."productId" = target_product_id
                          AND "product_reviews"."tenantId" = target_tenant_id
                          AND "product_reviews"."isApproved" = true)
WHERE "market_products"."id" = target_product_id
  AND "market_products"."tenantId" = target_tenant_id;

IF
(TG_OP = 'DELETE') THEN
        RETURN OLD;
ELSE
        RETURN NEW;
END IF;
END;
$$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_stats_on_review_change ON "product_reviews";

CREATE TRIGGER update_product_stats_on_review_change
    AFTER INSERT OR
UPDATE OR
DELETE
ON "product_reviews"
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_product_stats();

ALTER TABLE "market_products"
    ADD COLUMN IF NOT EXISTS "reviews_count" INT DEFAULT 0;
ALTER TABLE "market_products"
    ADD COLUMN IF NOT EXISTS "average_rating" DECIMAL (3, 2) DEFAULT 0;

#############################




###############################
