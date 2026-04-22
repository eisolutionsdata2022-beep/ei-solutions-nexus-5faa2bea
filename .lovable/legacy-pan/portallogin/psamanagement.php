<?php
require_once('../database/header.php');
if($userdata['status']=='paywait'){
echo '<script>
window.location = "paywait.php"
</script>
';	
}
?>

<!-- Begin Page Content -->
   <div class="container-fluid">  
   <!-- DataTales Example -->
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">PSA Management</h6>
            </div>
            <div class="card-body">

<?php
if(isset($_POST['pwd_reset']) AND !empty($_POST['vle_id']) ){

$csql = $conn->prepare("select * from loginusers WHERE username = ? ");
$csql->execute([get_safe_(base64_decode($_POST['vle_id']))]);
$row=$csql->fetch();
if($row['id']>0 AND ($row['createby']==$userdata['username'] || $userdata['username']==$row['username'] || $userdata['usertype']=="mainadmin")){
    
$url = $gateway_api->botapi_url."/api/psa_password";

$post_data = json_encode([
   "api_key" => $gateway_api->botapi_key, 
   "vle_id" => $row['username']
]); 

$results = curl_post_req($url,$post_data);
$response= json_decode($results,true);	
$status = $response['status'];
$message = $response['message'];
$userid = $row['username'];
if(strtolower($status)=='success'){
 echo '<div class="alert alert-success" role="alert">'.$message.'!</div>';       
}else{
 echo '<div class="alert alert-danger" role="alert">'.$message.'!</div>';     
}


} else {
echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Invalid Access!</div>';
}
	
}
?>


<?php
if(isset($_POST['psa_apply']) AND !empty($_POST['vle_id']) ){

$csql = $conn->prepare("select * from loginusers WHERE username = ? ");
$csql->execute([get_safe_(base64_decode($_POST['vle_id']))]);
$row=$csql->fetch();
$unm = explode('-',$row['username']);
$urname = $row['username'];//$unm['1'];

if($row['id']>0 AND ($row['createby']==$userdata['username'] || $userdata['username']==$row['username'] || $userdata['usertype']=="mainadmin")){
    
$url = $gateway_api->botapi_url."/api/psa_create";

$post_data = json_encode([
   "api_key" => $gateway_api->botapi_key, 
   "vle_id" => $urname, 
   "vle_name" => $row['owner_name'],
   "vle_shop" => $row['shop_name'],
   
   "vle_loc" => $row['address'],
   "vle_state" => $row['state'],

   "vle_uid" => "123456789325",
   "vle_pin" => $row['pin_code'],
   "vle_email" => $row['email_id'],
   "vle_mob" => $row['mobile_no'],
   "vle_pan" => $row['pan_no']
]); 

$results = curl_post_req($url,$post_data);
$response= json_decode($results,true);	
$status = $response['status'];
$message = $response['message'];
$re = $response['vle_regcode'];
$userid = $row['username'];
if(strtolower($status)=='success'){
$sql = $conn->prepare("UPDATE loginusers SET status='approved', vle_id='".$userid."', psa_reg_code='".$re."' WHERE id='".$row['id']."' ");
$sql->execute();    
 echo '<div class="alert alert-success" role="alert">'.$message.'!</div>';       
}else{
 echo '<div class="alert alert-danger" role="alert">'.$message.'!</div>';     
}


} else {
echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Invalid Access!</div>';
}
	
}
?>
			
			<div class='row'>
			<div class='col-md-6'>
			 <form class="user" action="" method="POST" enctype="multipart/form-data">

                <div class="form-group row">
                  <div class="col-sm-12 mb-3 mb-sm-3">
				    <btn-primary6 class="m-0 font-weight-bold text-primary">Select Vle Id</h6> 
<?php
if($userdata['usertype']!='retailer'){
$stmt = $conn->prepare("select * from loginusers WHERE createby = ? ORDER BY `id` DESC");
$stmt->execute([$userdata['username']]);
echo '<select name="vle_id" class="form-control select2" required>
<option value="'.base64_encode($userdata['username']).'">'.$userdata['username'].' - '.$userdata['owner_name'].'</option>';
while($row=$stmt->fetch()) {
	
	echo '<option value="'.base64_encode($row['username']).'">'.$row['username'].' - '.$row['owner_name'].'</option>';
}
echo '</select>';
}else{
?>		
                 
				  <input type="text" name="" placeholder="VLE ID" value='<?php echo $userdata['username']; ?>' class="form-control" readonly required>
				  <input type="hidden" name="vle_id" placeholder="VLE ID" value='<?php echo base64_encode($userdata['username']); ?>' class="form-control" readonly required>
<?php
}
?>                  
				  
				  </div><br>
                  <div class="col-sm-12 mb-3 mb-4">
                    <input required="required" type="submit" name="pwd_reset" class="btn btn-primary btn-block btn-sm" value="PSA Password Reset">
                  </div>
				  </div> 
				  
				  
				 </form>
				 
			     </div> 
			     
			<div class='col-md-6 mb-5'>	 
			
			 <form class="user" action="" method="POST" enctype="multipart/form-data">

                <div class="form-group row">
                  <div class="col-sm-12 mb-3 mb-sm-3">
				    <btn-primary6 class="m-0 font-weight-bold text-primary">Select Vle Id</h6> 
<?php
if($userdata['usertype']!='retailer'){
$stmt = $conn->prepare("select * from loginusers WHERE createby = ? ORDER BY `id` DESC");
$stmt->execute([$userdata['username']]);
echo '<select name="vle_id" class="form-control select2 select2-hidden-accessible" aria-hidden="true" required>
<option value="'.base64_encode($userdata['username']).'">'.$userdata['username'].' - '.$userdata['owner_name'].'</option>';
while($row=$stmt->fetch()) {
	
	echo '<option value="'.base64_encode($row['username']).'">'.$row['username'].' - '.$row['owner_name'].'</option>';
}
echo '</select>';
}else{
?>		
                 
				  <input type="text" name="" placeholder="VLE ID" value='<?php echo $userdata['username']; ?>' class="form-control" readonly required>
				  <input type="hidden" name="vle_id" placeholder="VLE ID" value='<?php echo base64_encode($userdata['username']); ?>' class="form-control" readonly required>
<?php
}
?>                  
				  
				  </div>
                  <div class="col-sm-12 mb-3 mb-4">
                    <input required="required" type="submit" name="psa_apply" class="btn btn-primary btn-block btn-sm" value="Apply PSA Now">
                  </div>
				  </div> 
				  
				  
				 </form>
				 
				 </div> 
				  </div> 
			   
			  
            </div>
          </div>
	  
        </div>
        <!-- /.container-fluid -->
      <!-- End of Main Content -->
<?php
require_once('../database/footer.php');
?>
<link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.2/css/select2.min.css" rel="stylesheet" />
<style>
.select2-container--default .select2-selection--single .select2-selection__rendered {
    color: #444;
    line-height: 12px;
    margin-top: -5px;
}    
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.2/js/select2.min.js"></script>
<script>
$(document).ready(function() {
$('.select2').select2({
    display: 'block',
    width: '100%',
    allowClear: false,
    height: 'calc(1.5em + .75rem + 2px)',
});
});
</script>