# Input data

An example of output for the first query before adding indexes:
```
                                                                                    QUERY PLAN
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=9014.04..9014.07 rows=10 width=32) (actual time=36.947..38.644 rows=4 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 25kB
   Buffers: shared hit=6063 read=483
   ->  Finalize GroupAggregate  (cost=9012.74..9013.88 rows=10 width=32) (actual time=36.913..38.612 rows=4 loops=1)
         Group Key: c.id
         Buffers: shared hit=6063 read=483
         ->  Gather Merge  (cost=9012.74..9013.74 rows=8 width=32) (actual time=36.904..38.604 rows=8 loops=1)
               Workers Planned: 2
               Workers Launched: 2
               Buffers: shared hit=6063 read=483
               ->  Partial GroupAggregate  (cost=8012.72..8012.79 rows=4 width=32) (actual time=31.525..31.529 rows=3 loops=3)
                     Group Key: c.id
                     Buffers: shared hit=6063 read=483
                     ->  Sort  (cost=8012.72..8012.73 rows=4 width=32) (actual time=31.517..31.519 rows=4 loops=3)
                           Sort Key: c.id
                           Sort Method: quicksort  Memory: 25kB
                           Buffers: shared hit=6063 read=483
                           Worker 0:  Sort Method: quicksort  Memory: 25kB
                           Worker 1:  Sort Method: quicksort  Memory: 25kB
                           ->  Hash Join  (cost=2006.89..8012.68 rows=4 width=32) (actual time=20.799..31.469 rows=4 loops=3)
                                 Hash Cond: (si.conversion_id = c.id)
                                 Buffers: shared hit=6047 read=483
                                 ->  Parallel Seq Scan on source_images si  (cost=0.00..5537.00 rows=125000 width=16) (actual time=0.017..6.785 rows=100000 loops=3)
                                       Buffers: shared hit=4287
                                 ->  Hash  (cost=2006.85..2006.85 rows=3 width=24) (actual time=18.110..18.111 rows=4 loops=3)
                                       Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                       Buffers: shared hit=1736 read=483
                                       ->  Hash Join  (cost=8.32..2006.85 rows=3 width=24) (actual time=8.447..18.099 rows=4 loops=3)
                                             Hash Cond: (c.user_id = u.id)
                                             Buffers: shared hit=1736 read=483
                                             ->  Seq Scan on conversions c  (cost=0.00..1736.00 rows=100000 width=32) (actual time=0.024..9.569 rows=100000 loops=3)
                                                   Buffers: shared hit=1728 read=480
                                             ->  Hash  (cost=8.30..8.30 rows=1 width=8) (actual time=0.073..0.074 rows=1 loops=3)
                                                   Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                                   Buffers: shared hit=8 read=3
                                                   ->  Index Scan using users_username_key on users u  (cost=0.29..8.30 rows=1 width=8) (actual time=0.060..0.061 rows=1 loops=3)
                                                         Index Cond: (username = 'alice_smith1'::text)
                                                         Buffers: shared hit=8 read=3
 Planning:
   Buffers: shared hit=91 read=10
 Planning Time: 1.540 ms
 Execution Time: 38.778 ms
(43 rows)
```
An example of output for the first query after adding indexes:
```
                                                                                QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=30.52..30.54 rows=10 width=32) (actual time=0.252..0.255 rows=4 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 25kB
   Buffers: shared hit=29 read=4
   ->  GroupAggregate  (cost=30.18..30.35 rows=10 width=32) (actual time=0.239..0.246 rows=4 loops=1)
         Group Key: c.id
         Buffers: shared hit=29 read=4
         ->  Sort  (cost=30.18..30.20 rows=10 width=32) (actual time=0.214..0.217 rows=12 loops=1)
               Sort Key: c.id
               Sort Method: quicksort  Memory: 25kB
               Buffers: shared hit=29 read=4
               ->  Nested Loop  (cost=5.03..30.01 rows=10 width=32) (actual time=0.105..0.203 rows=12 loops=1)
                     Buffers: shared hit=29 read=4
                     ->  Nested Loop  (cost=4.61..27.83 rows=3 width=24) (actual time=0.078..0.091 rows=4 loops=1)
                           Buffers: shared hit=9
                           ->  Index Scan using users_username_key on users u  (cost=0.29..8.30 rows=1 width=8) (actual time=0.048..0.049 rows=1 loops=1)
                                 Index Cond: (username = 'alice_smith1'::text)
                                 Buffers: shared hit=3
                           ->  Bitmap Heap Scan on conversions c  (cost=4.32..19.49 rows=4 width=32) (actual time=0.024..0.034 rows=4 loops=1)
                                 Recheck Cond: (u.id = user_id)
                                 Heap Blocks: exact=4
                                 Buffers: shared hit=6
                                 ->  Bitmap Index Scan on idx_conversions_user_id  (cost=0.00..4.32 rows=4 width=0) (actual time=0.008..0.008 rows=4 loops=1)
                                       Index Cond: (user_id = u.id)
                                       Buffers: shared hit=2
                     ->  Index Scan using idx_source_images_conversion_id on source_images si  (cost=0.42..0.69 rows=4 width=16) 
(actual time=0.020..0.026 rows=3 loops=4)
                           Index Cond: (conversion_id = c.id)
                           Buffers: shared hit=20 read=4
 Planning:
   Buffers: shared hit=65 read=11
 Planning Time: 1.551 ms
 Execution Time: 0.320 ms
(32 rows)
```

An example of output for the second query before adding indexes:
```
                                                                      QUERY PLAN
------------------------------------------------------------------------------------------------------------------------------------------------------
 Gather Merge  (cost=8979.21..8979.45 rows=2 width=72) (actual time=23.022..25.042 rows=149 loops=1)
   Workers Planned: 2
   Workers Launched: 2
   Buffers: shared hit=21643 read=395
   ->  Sort  (cost=7979.19..7979.19 rows=1 width=72) (actual time=20.221..20.226 rows=50 loops=3)
         Sort Key: c.created_at DESC
         Sort Method: quicksort  Memory: 30kB
         Buffers: shared hit=21643 read=395
         Worker 0:  Sort Method: quicksort  Memory: 29kB
         Worker 1:  Sort Method: quicksort  Memory: 29kB
         ->  Nested Loop  (cost=0.29..7979.18 rows=1 width=72) (actual time=0.614..20.135 rows=50 loops=3)
               Buffers: shared hit=21627 read=395
               ->  Parallel Seq Scan on source_images si  (cost=0.00..5537.00 rows=2362 width=68) (actual time=0.016..10.599 rows
=1970 loops=3)
                     Filter: (conversion_error IS NOT NULL)
                     Rows Removed by Filter: 98030
                     Buffers: shared hit=4287
               ->  Index Scan using conversions_pkey on conversions c  (cost=0.29..1.03 rows=1 width=20) (actual time=0.005..0.00
5 rows=0 loops=5911)
                     Index Cond: (id = si.conversion_id)
                     Filter: ((status = 'failed'::conversion_status) AND (created_at >= date_trunc('month'::text, CURRENT_TIMESTA
MP)))
                     Rows Removed by Filter: 1
                     Buffers: shared hit=17340 read=395
 Planning:
   Buffers: shared hit=21
 Planning Time: 0.374 ms
 Execution Time: 25.080 ms
(25 rows)
```
An example of output for the second query after adding indexes:
```
                                                                           QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=1157.84..1157.85 rows=3 width=72) (actual time=1.756..1.772 rows=149 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 38kB
   Buffers: shared hit=291 read=45
   ->  Nested Loop  (cost=5.09..1157.82 rows=3 width=72) (actual time=0.164..1.665 rows=149 loops=1)
         Buffers: shared hit=291 read=45
         ->  Bitmap Heap Scan on conversions c  (cost=4.67..163.74 rows=50 width=20) (actual time=0.126..0.326 rows=47 loops=1)
               Recheck Cond: ((created_at >= date_trunc('month'::text, CURRENT_TIMESTAMP)) AND (status = 'failed'::conversion_status))
               Heap Blocks: exact=44
               Buffers: shared hit=44 read=2
               ->  Bitmap Index Scan on idx_failed_conversions  (cost=0.00..4.66 rows=50 width=0) (actual time=0.107..0.108 rows=47 loops=1)
                     Index Cond: (created_at >= date_trunc('month'::text, CURRENT_TIMESTAMP))
                     Buffers: shared read=2
         ->  Index Scan using idx_source_images_conversion_id on source_images si  (cost=0.42..19.87 rows=1 width=68) (actual time=0.020..0.027 rows=3 loops=47)
               Index Cond: (conversion_id = c.id)
               Filter: (conversion_error IS NOT NULL)
               Buffers: shared hit=247 read=43
 Planning:
   Buffers: shared hit=14
 Planning Time: 0.541 ms
 Execution Time: 1.828 ms
(21 rows)
```

An example of output for the third query before adding indexes:
```
                                                                                   QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop  (cost=1000.72..6875.13 rows=4 width=104) (actual time=0.547..17.052 rows=2 loops=1)
   Buffers: shared hit=4298
   ->  Index Scan using conversions_pkey on conversions c  (cost=0.29..8.31 rows=1 width=32) (actual time=0.012..0.017 rows=1 loops=1)
         Index Cond: (id = 1234)
         Buffers: shared hit=3
   ->  Gather  (cost=1000.42..6866.78 rows=4 width=88) (actual time=0.533..17.030 rows=2 loops=1)
         Workers Planned: 2
         Workers Launched: 2
         Buffers: shared hit=4295
         ->  Nested Loop Left Join  (cost=0.42..5866.38 rows=2 width=88) (actual time=7.499..12.336 rows=1 loops=3)
               Buffers: shared hit=4295
               ->  Parallel Seq Scan on source_images si  (cost=0.00..5849.50 rows=2 width=41) (actual time=7.495..12.323 rows=1 loops=3)
                     Filter: (conversion_id = 1234)
                     Rows Removed by Filter: 99999
                     Buffers: shared hit=4287
               ->  Index Scan using converted_versions_source_image_id_key on converted_versions cv  (cost=0.42..8.44 rows=1 width=63) (actual time=0.012..0.012 rows=1 loops=2)
                     Index Cond: (source_image_id = si.id)
                     Buffers: shared hit=8
 Planning:
   Buffers: shared hit=16
 Planning Time: 0.319 ms
 Execution Time: 17.086 ms
(22 rows)
```
An example of output for the third query after adding indexes:
```
                                                                                QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop  (cost=5.17..62.25 rows=4 width=104) (actual time=0.148..0.175 rows=2 loops=1)
   Buffers: shared hit=15 read=1
   ->  Index Scan using conversions_pkey on conversions c  (cost=0.29..8.31 rows=1 width=32) (actual time=0.024..0.025 rows=1 loops=1)
         Index Cond: (id = 1234)
         Buffers: shared hit=3
   ->  Nested Loop Left Join  (cost=4.88..53.90 rows=4 width=88) (actual time=0.119..0.144 rows=2 loops=1)
         Buffers: shared hit=12 read=1
         ->  Bitmap Heap Scan on source_images si  (cost=4.45..20.14 rows=4 width=41) (actual time=0.099..0.112 rows=2 loops=1)
               Recheck Cond: (conversion_id = 1234)
               Heap Blocks: exact=2
               Buffers: shared hit=4 read=1
               ->  Bitmap Index Scan on idx_source_images_conversion_id  (cost=0.00..4.45 rows=4 width=0) (actual time=0.088..0.088 rows=2 loops=1)
                     Index Cond: (conversion_id = 1234)
                     Buffers: shared hit=2 read=1
         ->  Index Scan using converted_versions_source_image_id_key on converted_versions cv  (cost=0.42..8.44 rows=1 width=63) (actual time=0.012..0.012 rows=1 loops=2)
               Index Cond: (source_image_id = si.id)
               Buffers: shared hit=8
 Planning:
   Buffers: shared hit=16
 Planning Time: 0.455 ms
 Execution Time: 0.221 ms
(21 rows)
```

# What happens after adding indexes

* For the first request:
  * The index for source images by conversion ID `idx_source_images_conversion_id` enables to use Index Scan instead of Seq Scan. As a result, much less shared hit blocks are read to get source images belonging to conversions.
  * The same index simplifies aggregation to one stage (`GroupAggregate`) instead of two (`Partial GroupAggregate` + `Finalize GroupAggregate`).
  * The index for conversions by user's ID `idx_conversions_user_id` enables Bitmap Index Scan. Then about 1000 times less data are read to get conversions belonging to a user.
  * Overall, the request is about 100 times faster and reads hundreds of times less data.
* For the second request:
  * `idx_source_images_conversion_id` replaces `Parallel Seq Scan` with `Index Scan` for `source_images` table.
  * Index for sorting failed conversions by creation time `idx_failed_conversions` significantly reduces the amount of data to read.
  * Overall, orders of magnitude less data is read and the query is more than ten times faster.
* For the third request:
  * Due to `idx_source_images_conversion_id`, there is no need to scan all source images to get those belonging to the specified conversion.
  * Overall, the query is about tens times faster and the difference in reading data is even more dramatical.
