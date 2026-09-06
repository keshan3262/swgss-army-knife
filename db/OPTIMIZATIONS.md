# Input data

An example of output for the first query before adding indexes:
```
                                                                             QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=9218.70..9221.32 rows=1049 width=32) (actual time=34.624..35.715 rows=356 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 41kB
   Buffers: shared hit=6602 read=3
   ->  Finalize GroupAggregate  (cost=9042.68..9166.06 rows=1049 width=32) (actual time=34.326..35.611 rows=356 loops=1)
         Group Key: c.id
         Buffers: shared hit=6599 read=3
         ->  Gather Merge  (cost=9042.68..9151.20 rows=874 width=32) (actual time=34.322..35.536 rows=729 loops=1)
               Workers Planned: 2
               Workers Launched: 2
               Buffers: shared hit=6599 read=3
               ->  Partial GroupAggregate  (cost=8042.65..8050.30 rows=437 width=32) (actual time=31.296..31.357 rows=243 loops=3)
                     Group Key: c.id
                     Buffers: shared hit=6599 read=3
                     ->  Sort  (cost=8042.65..8043.74 rows=437 width=32) (actual time=31.281..31.295 rows=364 loops=3)
                           Sort Key: c.id
                           Sort Method: quicksort  Memory: 41kB
                           Buffers: shared hit=6599 read=3
                           Worker 0:  Sort Method: quicksort  Memory: 41kB
                           Worker 1:  Sort Method: quicksort  Memory: 42kB
                           ->  Hash Join  (cost=2013.36..8023.49 rows=437 width=32) (actual time=16.491..31.135 rows=364 loops=3)
                                 Hash Cond: (si.conversion_id = c.id)
                                 Buffers: shared hit=6525 read=3
                                 ->  Parallel Seq Scan on source_images si  (cost=0.00..5537.00 rows=125000 width=16) (actual time=0.006..8.218 rows=100000 loops=3)
                                       Buffers: shared hit=4287
                                 ->  Hash  (cost=2008.98..2008.98 rows=350 width=24) (actual time=16.423..16.425 rows=356 loops=3)
                                       Buckets: 1024  Batches: 1  Memory Usage: 28kB
                                       Buffers: shared hit=2214 read=3
                                       ->  Hash Join  (cost=6.59..2008.98 rows=350 width=24) (actual time=0.162..16.327 rows=356 loops=3)
                                             Hash Cond: (c.user_id = u.id)
                                             Buffers: shared hit=2214 read=3
                                             ->  Seq Scan on conversions c  (cost=0.00..1736.00 rows=100000 width=32) (actual time=0.007..8.466 rows=100000 loops=3)
                                                   Buffers: shared hit=2208
                                             ->  Hash  (cost=6.58..6.58 rows=1 width=8) (actual time=0.058..0.059 rows=1 loops=3)
                                                   Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                                   Buffers: shared hit=6 read=3
                                                   ->  Seq Scan on users u  (cost=0.00..6.58 rows=1 width=8) (actual time=0.020..0.056 rows=1 loops=3)
                                                         Filter: (username = 'alice_smith'::text)
                                                         Rows Removed by Filter: 285
                                                         Buffers: shared hit=6 read=3
 Planning:
   Buffers: shared hit=213 read=7 dirtied=2
 Planning Time: 1.664 ms
 Execution Time: 35.992 ms
(44 rows)
```
An example of output for the first query after adding indexes:
```
                                                                              QUERY PLAN                                      
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=817.21..819.83 rows=1049 width=32) (actual time=15.025..15.038 rows=356 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 41kB
   Buffers: shared hit=1744
   ->  HashAggregate  (cost=754.08..764.57 rows=1049 width=32) (actual time=14.895..14.936 rows=356 loops=1)
         Group Key: c.id
         Batches: 1  Memory Usage: 129kB
         Buffers: shared hit=1741
         ->  Nested Loop  (cost=14.72..748.84 rows=1049 width=32) (actual time=0.306..14.489 rows=1092 loops=1)
               Buffers: shared hit=1741
               ->  Nested Loop  (cost=14.72..635.94 rows=350 width=24) (actual time=0.201..2.783 rows=356 loops=1)
                     Buffers: shared hit=291
                     ->  Seq Scan on users u  (cost=0.00..6.58 rows=1 width=8) (actual time=0.017..0.036 rows=1 loops=1)
                           Filter: (username = 'alice_smith'::text)
                           Rows Removed by Filter: 285
                           Buffers: shared hit=3
                     ->  Bitmap Heap Scan on conversions c  (cost=14.72..625.86 rows=351 width=32) (actual time=0.183..2.671 rows=356 loops=1)
                           Recheck Cond: (u.id = user_id)
                           Heap Blocks: exact=286
                           Buffers: shared hit=288
                           ->  Bitmap Index Scan on idx_conversions_user_id  (cost=0.00..14.63 rows=351 width=0) (actual time=0.136..0.137 rows=356 loops=1)
                                 Index Cond: (user_id = u.id)
                                 Buffers: shared hit=2
               ->  Index Scan using idx_source_images_conversion_id on source_images si  (cost=0.00..0.28 rows=4 width=16) (actual time=0.017..0.032 rows=3 loops=356)
                     Index Cond: (conversion_id = c.id)
                     Buffers: shared hit=1450
 Planning:
   Buffers: shared hit=269 read=1
 Planning Time: 2.466 ms
 Execution Time: 15.231 ms
(30 rows)
```

An example of output for the second query before adding indexes:
```
                                                                      QUERY PLAN
------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=9077.57..9077.58 rows=2 width=72) (actual time=25.441..27.477 rows=75 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 31kB
   Buffers: shared hit=21389 read=450
   ->  Gather  (cost=1000.29..9077.56 rows=2 width=72) (actual time=6.648..27.393 rows=75 loops=1)
         Workers Planned: 2
         Workers Launched: 2
         Buffers: shared hit=21386 read=450
         ->  Nested Loop  (cost=0.29..8077.36 rows=1 width=72) (actual time=3.239..22.447 rows=25 loops=3)
               Buffers: shared hit=21386 read=450
               ->  Parallel Seq Scan on source_images si  (cost=0.00..5537.00 rows=2667 width=68) (actual time=0.024..11.657 rows=1950 loops=3)
                     Filter: (conversion_error IS NOT NULL)
                     Rows Removed by Filter: 98050
                     Buffers: shared hit=4287
               ->  Index Scan using conversions_pkey on conversions c  (cost=0.29..0.95 rows=1 width=20) (actual time=0.005..0.005 rows=0 loops=5849)
                     Index Cond: (id = si.conversion_id)
                     Filter: ((status = 'failed'::conversion_status) AND (created_at >= date_trunc('month'::text, CURRENT_TIMESTAMP)))
                     Rows Removed by Filter: 1
                     Buffers: shared hit=17099 read=450
 Planning:
   Buffers: shared hit=245 dirtied=1
 Planning Time: 1.692 ms
 Execution Time: 27.591 ms
(23 rows)
```
An example of output for the second query after adding indexes:
```
                                                                     QUERY PLAN                                                                      
-----------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=630.07..630.07 rows=2 width=72) (actual time=3.316..3.337 rows=75 loops=1)
   Sort Key: c.created_at DESC
   Sort Method: quicksort  Memory: 31kB
   Buffers: shared hit=132 read=2
   ->  Nested Loop  (cost=8.52..630.06 rows=2 width=72) (actual time=0.424..3.172 rows=75 loops=1)
         Buffers: shared hit=129 read=2
         ->  Bitmap Heap Scan on conversions c  (cost=4.49..97.52 rows=27 width=20) (actual time=0.280..0.679 rows=26 loops=1)
               Recheck Cond: ((created_at >= date_trunc('month'::text, CURRENT_TIMESTAMP)) AND (status = 'failed'::conversion_status))
               Heap Blocks: exact=26
               Buffers: shared hit=26 read=2
               ->  Bitmap Index Scan on idx_failed_conversions  (cost=0.00..4.48 rows=27 width=0) (actual time=0.182..0.183 rows=26 loops=1)
                     Index Cond: (created_at >= date_trunc('month'::text, CURRENT_TIMESTAMP))
                     Buffers: shared read=2
         ->  Bitmap Heap Scan on source_images si  (cost=4.03..19.71 rows=1 width=68) (actual time=0.050..0.093 rows=3 loops=26)
               Recheck Cond: (conversion_id = c.id)
               Filter: (conversion_error IS NOT NULL)
               Heap Blocks: exact=75
               Buffers: shared hit=103
               ->  Bitmap Index Scan on idx_source_images_conversion_id  (cost=0.00..4.03 rows=4 width=0) (actual time=0.026..0.026 rows=3 loops=26)
                     Index Cond: (conversion_id = c.id)
                     Buffers: shared hit=28
 Planning:
   Buffers: shared hit=292
 Planning Time: 2.186 ms
 Execution Time: 3.458 ms
(25 rows)
```

An example of output for the third query before adding indexes:
```
                                                                                   QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop  (cost=1000.86..6879.32 rows=4 width=96) (actual time=1.121..16.063 rows=1 loops=1)
   Buffers: shared hit=4299
   ->  Nested Loop  (cost=0.44..12.50 rows=1 width=24) (actual time=0.067..0.071 rows=1 loops=1)
         Buffers: shared hit=8
         ->  Index Scan using conversions_pkey on conversions c  (cost=0.29..8.31 rows=1 width=32) (actual time=0.053..0.056 rows=1 loops=1)
               Index Cond: (id = 1234)
               Buffers: shared hit=6
         ->  Index Only Scan using users_pkey on users u  (cost=0.15..4.17 rows=1 width=8) (actual time=0.007..0.007 rows=1 loops=1)
               Index Cond: (id = c.user_id)
               Heap Fetches: 0
               Buffers: shared hit=2
   ->  Gather  (cost=1000.42..6866.78 rows=4 width=88) (actual time=1.052..15.989 rows=1 loops=1)
         Workers Planned: 2
         Workers Launched: 2
         Buffers: shared hit=4291
         ->  Nested Loop Left Join  (cost=0.42..5866.38 rows=2 width=88) (actual time=6.204..10.567 rows=0 loops=3)
               Buffers: shared hit=4291
               ->  Parallel Seq Scan on source_images si  (cost=0.00..5849.50 rows=2 width=41) (actual time=6.197..10.559 rows=0 loops=3)
                     Filter: (conversion_id = 1234)
                     Rows Removed by Filter: 100000
                     Buffers: shared hit=4287
               ->  Index Scan using converted_versions_source_image_id_key on converted_versions cv  (cost=0.42..8.44 rows=1 width=63) (actual time=0.018..0.019 rows=1 loops=1)
                     Index Cond: (source_image_id = si.id)
                     Buffers: shared hit=4
 Planning:
   Buffers: shared hit=348
 Planning Time: 1.323 ms
 Execution Time: 16.220 ms
(28 rows)
```
An example of output for the third query after adding indexes:
```
                                                                             QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop Left Join  (cost=4.89..66.02 rows=4 width=96) (actual time=0.391..0.395 rows=1 loops=1)
   Buffers: shared hit=18
   ->  Nested Loop  (cost=4.47..32.26 rows=4 width=49) (actual time=0.321..0.324 rows=1 loops=1)
         Buffers: shared hit=14
         ->  Nested Loop  (cost=0.44..12.50 rows=1 width=24) (actual time=0.134..0.136 rows=1 loops=1)
               Buffers: shared hit=8
               ->  Index Scan using conversions_pkey on conversions c  (cost=0.29..8.31 rows=1 width=32) (actual time=0.112..0.113 rows=1 loops=1)
                     Index Cond: (id = 1234)
                     Buffers: shared hit=6
               ->  Index Only Scan using users_pkey on users u  (cost=0.15..4.17 rows=1 width=8) (actual time=0.009..0.009 rows=1 loops=1)
                     Index Cond: (id = c.user_id)
                     Heap Fetches: 0
                     Buffers: shared hit=2
         ->  Bitmap Heap Scan on source_images si  (cost=4.03..19.71 rows=4 width=41) (actual time=0.174..0.175 rows=1 loops=1)
               Recheck Cond: (conversion_id = 1234)
               Heap Blocks: exact=1
               Buffers: shared hit=6
               ->  Bitmap Index Scan on idx_source_images_conversion_id  (cost=0.00..4.03 rows=4 width=0) (actual time=0.136..0.136 rows=1 loops=1)
                     Index Cond: (conversion_id = 1234)
                     Buffers: shared hit=5
   ->  Index Scan using converted_versions_source_image_id_key on converted_versions cv  (cost=0.42..8.44 rows=1 width=63) (actual time=0.067..0.067 rows=1 loops=1)
         Index Cond: (source_image_id = si.id)
         Buffers: shared hit=4
 Planning:
   Buffers: shared hit=398
 Planning Time: 3.379 ms
 Execution Time: 0.682 ms
(27 rows)
```

# What happens after adding indexes

* For the first request:
  * The index for source images by conversion ID `idx_source_images_conversion_id` enables to use Index Scan instead of Seq Scan. As a result, much less shared hit blocks are read to get source images belonging to conversions.
  * The same index simplifies aggregation to one stage (`HashAggregate`) instead of two (`Partial GroupAggregate` + `Finalize GroupAggregate`).
  * Additionally, it removes the need to sort transient result by conversion ID to find matches.
  * The index for conversions by user's ID `idx_conversions_user_id` enables Bitmap Index Scan. Then about 1000 times less data are read to get conversions belonging to a user.
  * Overall, the request is about two times faster and a few times less data is read.
* For the second request:
  * `idx_source_images_conversion_id` enables applying `conversion_error` filter for much less source images and speeds up the search of them.
  * Index for sorting failed conversions by creation time `idx_failed_conversions` speeds up the search of conversions meeting both conditions.
  * Overall, orders of magnitude less data is read and the query is a few times faster.
* For the third request:
  * Due to `idx_source_images_conversion_id`, there is no need to scan all source images to get those belonging to the specified conversion.
  * Overall, the query is an order of magnitude faster and the difference in reading data is even more dramatical.
