DO $$
DECLARE
  v_rest_id UUID;
  v_table_id UUID;
  v_item1 UUID;
  v_item2 UUID;
BEGIN
  -- Get your restaurant ID
  SELECT id INTO v_rest_id FROM restaurants LIMIT 1;
  SELECT id INTO v_table_id FROM tables
    WHERE restaurant_id = v_rest_id LIMIT 1;
  SELECT id INTO v_item1 FROM menu_items
    WHERE restaurant_id = v_rest_id AND station = 'food' LIMIT 1;
  SELECT id INTO v_item2 FROM menu_items
    WHERE restaurant_id = v_rest_id AND station = 'juice' LIMIT 1;

  IF v_rest_id IS NULL OR v_table_id IS NULL THEN
    RAISE NOTICE 'No restaurant or tables found. Run seed first.';
    RETURN;
  END IF;

  -- Insert 10 test orders spread across this week
  FOR i IN 1..10 LOOP
    DECLARE v_order_id UUID := gen_random_uuid();
    BEGIN
      INSERT INTO orders (
        id, restaurant_id, table_id, status,
        total_amount, payment_method, payment_status,
        created_at, updated_at
      ) VALUES (
        v_order_id, v_rest_id, v_table_id,
        (CASE WHEN i % 3 = 0 THEN 'served'
             WHEN i % 3 = 1 THEN 'confirmed'
             ELSE 'preparing' END)::order_status,
        (50 + (i * 30))::numeric,
        (CASE WHEN i % 2 = 0 THEN 'online' ELSE 'cash' END)::payment_method,
        (CASE WHEN i % 2 = 0 THEN 'paid' ELSE 'pending' END)::payment_status,
        NOW() - ((7 - i) || ' days')::interval
          + (i * 2 || ' hours')::interval,
        NOW() - ((7 - i) || ' days')::interval
          + (i * 2 + 1 || ' hours')::interval
      );

      -- Add order items if menu items exist
      IF v_item1 IS NOT NULL THEN
        INSERT INTO order_items (order_id, menu_item_id, quantity, price, station, status)
        VALUES (v_order_id, v_item1, 1 + (i % 3), 80, 'food'::station_type, 'done'::item_status);
      END IF;

      IF v_item2 IS NOT NULL AND i % 2 = 0 THEN
        INSERT INTO order_items (order_id, menu_item_id, quantity, price, station, status)
        VALUES (v_order_id, v_item2, 1, 60, 'juice'::station_type, 'done'::item_status);
      END IF;
    END;
  END LOOP;

  RAISE NOTICE 'Test orders inserted successfully';
END $$;
