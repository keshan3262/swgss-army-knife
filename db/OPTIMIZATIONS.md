# Input data

An example of output for the first query before adding indexes:
```
                                                                                    QUERY PLAN
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=9014.04..9014.07 rows=10 width=32) (actual time=35.620..37.293 rows=2 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 25kB
   Buffers: shared hit=6068 read=478
   ->  Finalize GroupAggregate  (cost=9012.74..9013.88 rows=10 width=32) (actual time=35.615..37.287 rows=2 loops=1)
         Group Key: c.id
         Buffers: shared hit=6068 read=478
         ->  Gather Merge  (cost=9012.74..9013.74 rows=8 width=32) (actual time=35.612..37.282 rows=3 loops=1)
               Workers Planned: 2
               Workers Launched: 2
               Buffers: shared hit=6068 read=478
               ->  Partial GroupAggregate  (cost=8012.72..8012.79 rows=4 width=32) (actual time=32.213..32.216 rows=1 loops=3)
                     Group Key: c.id
                     Buffers: shared hit=6068 read=478
                     ->  Sort  (cost=8012.72..8012.73 rows=4 width=32) (actual time=32.208..32.210 rows=1 loops=3)
                           Sort Key: c.id
                           Sort Method: quicksort  Memory: 25kB
                           Buffers: shared hit=6068 read=478
                           Worker 0:  Sort Method: quicksort  Memory: 25kB
                           Worker 1:  Sort Method: quicksort  Memory: 25kB
                           ->  Hash Join  (cost=2006.89..8012.68 rows=4 width=32) (actual time=23.585..32.180 rows=1 loops=3)
                                 Hash Cond: (si.conversion_id = c.id)
                                 Buffers: shared hit=6052 read=478
                                 ->  Parallel Seq Scan on source_images si  (cost=0.00..5537.00 rows=125000 width=16) (actual time=0.007..7.023 rows=100000 loops=3)
                                       Buffers: shared hit=4287
                                 ->  Hash  (cost=2006.85..2006.85 rows=3 width=24) (actual time=18.383..18.385 rows=2 loops=3)
                                       Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                       Buffers: shared hit=1741 read=478
                                       ->  Hash Join  (cost=8.32..2006.85 rows=3 width=24) (actual time=3.015..18.378 rows=2 loops=3)
                                             Hash Cond: (c.user_id = u.id)
                                             Buffers: shared hit=1741 read=478
                                             ->  Seq Scan on conversions c  (cost=0.00..1736.00 rows=100000 width=32) (actual time=0.011..9.030 rows=100000 loops=3)
                                                   Buffers: shared hit=1731 read=477
                                             ->  Hash  (cost=8.30..8.30 rows=1 width=8) (actual time=0.049..0.049 rows=1 loops=3)
                                                   Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                                   Buffers: shared hit=10 read=1
                                                   ->  Index Scan using users_username_key on users u  (cost=0.29..8.30 rows=1 width=8) (actual time=0.042..0.043 rows=1 loops=3)
                                                         Index Cond: (username = 'alice_smith1'::text)
                                                         Buffers: shared hit=10 read=1
 Planning:
   Buffers: shared hit=12
 Planning Time: 0.242 ms
 Execution Time: 37.348 ms
(43 rows)
```
An example of output for the first query after adding indexes:
```
                                                                                QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=29.02..29.04 rows=10 width=32) (actual time=0.152..0.155 rows=2 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 25kB
   Buffers: shared hit=13
   ->  GroupAggregate  (cost=28.68..28.85 rows=10 width=32) (actual time=0.143..0.146 rows=2 loops=1)
         Group Key: c.id
         Buffers: shared hit=13
         ->  Sort  (cost=28.68..28.70 rows=10 width=32) (actual time=0.130..0.132 rows=3 loops=1)
               Sort Key: c.id
               Sort Method: quicksort  Memory: 25kB
               Buffers: shared hit=13
               ->  Nested Loop  (cost=4.32..28.51 rows=10 width=32) (actual time=0.096..0.120 rows=3 loops=1)
                     Buffers: shared hit=13
                     ->  Nested Loop  (cost=4.32..27.54 rows=3 width=24) (actual time=0.076..0.084 rows=2 loops=1)
                           Buffers: shared hit=7
                           ->  Index Scan using users_username_key on users u  (cost=0.29..8.30 rows=1 width=8) (actual time=0.033..0.034 rows=1 loops=1)
                                 Index Cond: (username = 'alice_smith1'::text)
                                 Buffers: shared hit=3
                           ->  Bitmap Heap Scan on conversions c  (cost=4.03..19.20 rows=4 width=32) (actual time=0.039..0.044 rows=2 loops=1)
                                 Recheck Cond: (u.id = user_id)
                                 Heap Blocks: exact=2
                                 Buffers: shared hit=4
                                 ->  Bitmap Index Scan on idx_conversions_user_id  (cost=0.00..4.03 rows=4 width=0) (actual time=0.020..0.020 rows=2 loops=1)
                                       Index Cond: (user_id = u.id)
                                       Buffers: shared hit=2
                     ->  Index Scan using idx_source_images_conversion_id on source_images si  (cost=0.00..0.28 rows=4 width=16) (actual time=0.014..0.016 rows=2 loops=2)
                           Index Cond: (conversion_id = c.id)
                           Buffers: shared hit=6
 Planning:
   Buffers: shared hit=76 read=7
 Planning Time: 1.645 ms
 Execution Time: 0.227 ms
(32 rows)
```

An example of output for the second query before adding indexes:
```
                                                                      QUERY PLAN
------------------------------------------------------------------------------------------------------------------------------------------------------
 Gather Merge  (cost=9072.91..9073.14 rows=2 width=72) (actual time=24.478..26.621 rows=106 loops=1)
   Workers Planned: 2
   Workers Launched: 2
   Buffers: shared hit=22455
   ->  Sort  (cost=8072.88..8072.89 rows=1 width=72) (actual time=20.470..20.474 rows=35 loops=3)
         Sort Key: c.created_at DESC
         Sort Method: quicksort  Memory: 28kB
         Buffers: shared hit=22455
         Worker 0:  Sort Method: quicksort  Memory: 27kB
         Worker 1:  Sort Method: quicksort  Memory: 28kB
         ->  Nested Loop  (cost=0.29..8072.87 rows=1 width=72) (actual time=1.081..20.397 rows=35 loops=3)
               Buffers: shared hit=22439
               ->  Parallel Seq Scan on source_images si  (cost=0.00..5537.00 rows=2654 width=68) (actual time=0.018..12.790 rows=2017 loops=3)
                     Filter: (conversion_error IS NOT NULL)
                     Rows Removed by Filter: 97983
                     Buffers: shared hit=4287
               ->  Index Scan using conversions_pkey on conversions c  (cost=0.29..0.96 rows=1 width=20) (actual time=0.004..0.004 rows=0 loops=6050)
                     Index Cond: (id = si.conversion_id)
                     Filter: ((status = 'failed'::conversion_status) AND (created_at >= date_trunc('month'::text, CURRENT_TIMESTAMP)))
                     Rows Removed by Filter: 1
                     Buffers: shared hit=18152
 Planning:
   Buffers: shared hit=6
 Planning Time: 0.433 ms
 Execution Time: 26.664 ms
(25 rows)
```
An example of output for the second query after adding indexes:
```
                                                                           QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=971.80..971.81 rows=3 width=72) (actual time=0.989..0.997 rows=106 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 34kB
   Buffers: shared hit=173 read=2
   ->  Nested Loop  (cost=4.61..971.78 rows=3 width=72) (actual time=0.180..0.925 rows=106 loops=1)
         Buffers: shared hit=173 read=2
         ->  Bitmap Heap Scan on conversions c  (cost=4.61..140.42 rows=42 width=20) (actual time=0.150..0.268 rows=34 loops=1)
               Recheck Cond: ((created_at >= date_trunc('month'::text, CURRENT_TIMESTAMP)) AND (status = 'failed'::conversion_status))
               Heap Blocks: exact=33
               Buffers: shared hit=33 read=2
               ->  Bitmap Index Scan on idx_failed_conversions  (cost=0.00..4.60 rows=42 width=0) (actual time=0.124..0.125 rows=34 loops=1)
                     Index Cond: (created_at >= date_trunc('month'::text, CURRENT_TIMESTAMP))
                     Buffers: shared read=2
         ->  Index Scan using idx_source_images_conversion_id on source_images si  (cost=0.00..19.78 rows=1 width=68) (actual time=0.008..0.018 rows=3 loops=34)
               Index Cond: (conversion_id = c.id)
               Filter: (conversion_error IS NOT NULL)
               Buffers: shared hit=140
 Planning:
   Buffers: shared hit=6
 Planning Time: 0.400 ms
 Execution Time: 1.037 ms
(21 rows)
```

An example of output for the third query before adding indexes:
```
                                                                                   QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop  (cost=1000.72..6875.13 rows=4 width=104) (actual time=1.039..19.653 rows=2 loops=1)
   Buffers: shared hit=4299
   ->  Index Scan using conversions_pkey on conversions c  (cost=0.29..8.31 rows=1 width=32) (actual time=0.020..0.029 rows=1 loops=1)
         Index Cond: (id = 1234)
         Buffers: shared hit=3
   ->  Gather  (cost=1000.42..6866.78 rows=4 width=88) (actual time=1.014..19.615 rows=2 loops=1)
         Workers Planned: 2
         Workers Launched: 2
         Buffers: shared hit=4296
         ->  Nested Loop Left Join  (cost=0.42..5866.38 rows=2 width=88) (actual time=6.326..12.349 rows=1 loops=3)
               Buffers: shared hit=4296
               ->  Parallel Seq Scan on source_images si  (cost=0.00..5849.50 rows=2 width=41) (actual time=6.285..12.307 rows=1 loops=3)
                     Filter: (conversion_id = 1234)
                     Rows Removed by Filter: 99999
                     Buffers: shared hit=4287
               ->  Index Scan using converted_versions_source_image_id_key on converted_versions cv  (cost=0.42..8.44 rows=1 width=63) (actual time=0.051..0.051 rows=1 loops=2)
                     Index Cond: (source_image_id = si.id)
                     Buffers: shared hit=9
 Planning:
   Buffers: shared hit=72
 Planning Time: 0.710 ms
 Execution Time: 19.701 ms
(22 rows)
```
An example of output for the third query after adding indexes:
```
                                                                                QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop  (cost=4.75..61.82 rows=4 width=104) (actual time=0.073..0.095 rows=2 loops=1)
   Buffers: shared hit=14
   ->  Index Scan using conversions_pkey on conversions c  (cost=0.29..8.31 rows=1 width=32) (actual time=0.022..0.024 rows=1 loops=1)
         Index Cond: (id = 1234)
         Buffers: shared hit=3
   ->  Nested Loop Left Join  (cost=4.45..53.47 rows=4 width=88) (actual time=0.047..0.065 rows=2 loops=1)
         Buffers: shared hit=11
         ->  Bitmap Heap Scan on source_images si  (cost=4.03..19.71 rows=4 width=41) (actual time=0.030..0.037 rows=2 loops=1)
               Recheck Cond: (conversion_id = 1234)
               Heap Blocks: exact=2
               Buffers: shared hit=3
               ->  Bitmap Index Scan on idx_source_images_conversion_id  (cost=0.00..4.03 rows=4 width=0) (actual time=0.013..0.013 rows=2 loops=1)
                     Index Cond: (conversion_id = 1234)
                     Buffers: shared hit=1
         ->  Index Scan using converted_versions_source_image_id_key on converted_versions cv  (cost=0.42..8.44 rows=1 width=63) (actual time=0.011..0.011 rows=1 loops=2)
               Index Cond: (source_image_id = si.id)
               Buffers: shared hit=8
 Planning:
   Buffers: shared hit=16
 Planning Time: 0.623 ms
 Execution Time: 0.144 ms
(21 rows)
```

# What happens after adding indexes

* For the first request:
  * The index for source images by conversion ID `idx_source_images_conversion_id` enables to use Index Scan instead of Seq Scan. As a result, much less shared hit blocks are read to get source images belonging to conversions.
  * The same index simplifies aggregation to one stage (`GroupAggregate`) instead of two (`Partial GroupAggregate` + `Finalize GroupAggregate`).
  * The index for conversions by user's ID `idx_conversions_user_id` enables Bitmap Index Scan. Then about 1000 times less data are read to get conversions belonging to a user.
  * `idx_user_conversions` index is used implicitly: `idx_scan` counter for it increases and the query becomes faster than without it.
  * Overall, the request is about 100 times faster and reads the amount of buffer that looks like minimal possible.
* For the second request:
  * `idx_source_images_conversion_id` replaces `Parallel Seq Scan` with `Index Scan` for `source_images` table.
  * Index for sorting failed conversions by creation time `idx_failed_conversions` significantly reduces the amount of data to read.
  * `idx_user_conversions` is used here too and improves performance.
  * Overall, orders of magnitude less data is read and the query is more than ten times faster.
* For the third request:
  * Due to `idx_source_images_conversion_id`, there is no need to scan all source images to get those belonging to the specified conversion.
  * `idx_user_conversions` 
  * Overall, the query about 100 times faster and the difference in reading data is even more dramatical.
