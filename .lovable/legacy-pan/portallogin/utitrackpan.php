<?php
require_once('../database/header.php');
?>
<!-- Begin Page Content -->
   <div class="container-fluid">

          <!-- DataTales Example -->
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">UTI PAN Application Track</h6>
            </div>
            <div class="card-body" style="overflow: hidden;">
              
		
<form class="user" action="" method="POST" enctype="multipart/form-data">
<div class="form-group row">
<div class="col-sm-8 mb-3 mb-sm-2">
<btn-primary6 class="m-0 font-weight-bold text-primary">Coupon Number</h6> 
<input required="required" type="text" class="form-control" placeholder="Coupon Number" name="ack_no">
</div>
<div class="col-sm-4 mb-3 mb-sm-2"><br>
<button class="btn btn-primary bg-primary text-white btn-block" name="track" type="submit">Submit</button>
</div>
</div>
</form>

<?php
if(isset($_POST['track']) && !empty($_POST['ack_no'])){
$ack_no = get_safe($_POST['ack_no']); 
$url = $gateway_api->botapi_url."/Api/PANStatus";

$post_data = json_encode([
   "api_key" => $gateway_api->botapi_key, 
   "ack_no" => $ack_no,
]); 

$results = curl_post_req($url,$post_data);
$response= json_decode($results,true);	
$status = $response['status'];
$message = $response['message'];
$pan_status = $response['results']['status'];
$pan = $response['results']['pan_no'];
if($status=="SUCCESS"){
?>
<div class="card bg-primary text-white" style="padding:1rem;border-radius:0.4em">
<h4>Your PAN Application Status :</h4>    
<table class="table table-bordered bg-primary">
    <tr class="text-white"><td>Coupon Number :</td><td><?=$ack_no?></td></tr>
    <tr class="text-white"><td>Application Status :</td><td><small><p><?=strtoupper($pan_status)?></p></small></td></tr>
    <tr class="text-white"><td>Permanent Account Number (PAN) :</td><td><?=!empty($pan) ? strtoupper($pan) : "Processing"?></td></tr>
</table>
</div>
<?php    
}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> '.$message.'!</div>';   
}
}
?>
</div>		  

            </div>
          </div>

        </div>
        <!-- /.container-fluid -->
      <!-- End of Main Content -->
<?php
require_once('../database/footer.php');
?>